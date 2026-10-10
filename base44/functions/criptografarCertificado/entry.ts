import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { certificado_base64, senha } = await req.json();

    if (!certificado_base64 || !senha) {
      return Response.json({ 
        error: 'Parâmetros obrigatórios: certificado_base64, senha' 
      }, { status: 400 });
    }

    const chaveEncriptacao = Deno.env.get('INFOSIMPLES_ENCRYPTION_KEY');
    if (!chaveEncriptacao) {
      return Response.json({ 
        error: 'INFOSIMPLES_ENCRYPTION_KEY não configurado' 
      }, { status: 500 });
    }

    // Criptografar certificado (já em base64)
    const certCriptografado = await encriptarAES256GCM(certificado_base64, chaveEncriptacao);
    
    // Criptografar senha
    const senhaCriptografada = await encriptarAES256GCM(senha, chaveEncriptacao);

    return Response.json({
      success: true,
      pkcs12_cert: certCriptografado,
      pkcs12_pass: senhaCriptografada
    });

  } catch (error) {
    console.error('Erro ao criptografar certificado:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});

async function encriptarAES256GCM(plaintext, key) {
  // Converter chave para bytes
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  
  // Importar chave
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Gerar IV aleatório (12 bytes para GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Criptografar
  const plaintextBytes = encoder.encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    cryptoKey,
    plaintextBytes
  );

  // Combinar IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Converter para base64 e substituir caracteres
  let base64 = btoa(String.fromCharCode(...combined));
  base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  
  return base64;
}