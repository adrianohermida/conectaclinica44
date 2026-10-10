import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const certificateFile = formData.get('certificate');
    const password = formData.get('password');

    if (!certificateFile || !password) {
      return Response.json({ 
        error: 'Certificado e senha são obrigatórios' 
      }, { status: 400 });
    }

    // Ler bytes do certificado
    const certBytes = new Uint8Array(await certificateFile.arrayBuffer());
    
    // Usar OpenSSL para extrair informações do certificado
    const tempCertPath = `/tmp/cert_${Date.now()}.pfx`;
    const tempPemPath = `/tmp/cert_${Date.now()}.pem`;
    
    await Deno.writeFile(tempCertPath, certBytes);
    
    // Converter PFX para PEM usando senha
    const convertCmd = new Deno.Command('openssl', {
      args: [
        'pkcs12',
        '-in', tempCertPath,
        '-out', tempPemPath,
        '-nodes',
        '-passin', `pass:${password}`
      ],
      stdout: 'piped',
      stderr: 'piped'
    });

    const convertResult = await convertCmd.output();
    
    if (!convertResult.success) {
      const error = new TextDecoder().decode(convertResult.stderr);
      
      // Limpar arquivos temporários
      try { await Deno.remove(tempCertPath); } catch {}
      try { await Deno.remove(tempPemPath); } catch {}
      
      return Response.json({ 
        error: 'Senha incorreta ou certificado inválido',
        details: error
      }, { status: 400 });
    }

    // Extrair informações do certificado
    const infoCmd = new Deno.Command('openssl', {
      args: [
        'x509',
        '-in', tempPemPath,
        '-noout',
        '-subject',
        '-issuer',
        '-serial',
        '-startdate',
        '-enddate'
      ],
      stdout: 'piped',
      stderr: 'piped'
    });

    const infoResult = await infoCmd.output();
    const certInfo = new TextDecoder().decode(infoResult.stdout);

    // Parse das informações
    const lines = certInfo.split('\n');
    const parsedInfo = {};

    lines.forEach(line => {
      if (line.startsWith('subject=')) {
        const subjectParts = line.substring(8).split(',').map(s => s.trim());
        subjectParts.forEach(part => {
          const [key, ...valueParts] = part.split('=');
          const value = valueParts.join('=').trim();
          if (key === 'CN') parsedInfo.nome = value;
          if (key === 'serialNumber') parsedInfo.cnpj_cpf = value;
        });
      }
      if (line.startsWith('issuer=')) {
        const issuerParts = line.substring(7).split(',').map(s => s.trim());
        issuerParts.forEach(part => {
          const [key, ...valueParts] = part.split('=');
          const value = valueParts.join('=').trim();
          if (key === 'CN') parsedInfo.autoridade_certificadora = value;
        });
      }
      if (line.startsWith('serial=')) {
        parsedInfo.numero_serie = line.substring(7).trim();
      }
      if (line.startsWith('notBefore=')) {
        const dateStr = line.substring(10).trim();
        parsedInfo.data_emissao = new Date(dateStr).toISOString().split('T')[0];
      }
      if (line.startsWith('notAfter=')) {
        const dateStr = line.substring(9).trim();
        parsedInfo.data_validade = new Date(dateStr).toISOString().split('T')[0];
      }
    });

    // Upload do certificado para storage
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadPrivateFile({
      file: certBytes
    });

    // Limpar arquivos temporários
    try { await Deno.remove(tempCertPath); } catch {}
    try { await Deno.remove(tempPemPath); } catch {}

    return Response.json({
      success: true,
      certificado: {
        nome: parsedInfo.nome || 'N/A',
        tipo: 'A1 (Arquivo)',
        titular: parsedInfo.nome || 'N/A',
        cnpj_cpf: parsedInfo.cnpj_cpf || 'N/A',
        numero_serie: parsedInfo.numero_serie || 'N/A',
        autoridade_certificadora: parsedInfo.autoridade_certificadora || 'N/A',
        data_emissao: parsedInfo.data_emissao,
        data_validade: parsedInfo.data_validade,
        arquivo_uri: uploadResult.file_uri
      }
    });

  } catch (error) {
    console.error('Erro ao processar certificado:', error);
    return Response.json({ 
      error: 'Erro ao processar certificado',
      details: error.message 
    }, { status: 500 });
  }
});