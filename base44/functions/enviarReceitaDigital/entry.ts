import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { enviarEmail } from './services/emailService.js';

/**
 * SPRINT 2: Enviar receita digital com QR code validação
 * Gera QR code único para validação autenticidade
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prescricao_id } = await req.json();
    const prescricao = await base44.entities.PrescricaoEletronica.filter({ id: prescricao_id })[0];
    
    if (!prescricao) {
      return Response.json({ error: 'Prescrição não encontrada' }, { status: 404 });
    }

    const paciente = await base44.entities.Contato.filter({ id: prescricao.paciente_id })[0];
    const medico = await base44.entities.Medico.filter({ email: prescricao.created_by })[0];
    const clinica = await base44.entities.Clinica.filter({ id: user.clinica_id })[0];

    // Gerar QR code (validação)
    const qrData = `https://app.conectaclinica.com.br/validar-receita/${prescricao.id}`;
    
    // Gerar QR via API externa (ou lib local)
    const qrResponse = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`);
    const qrBuffer = await qrResponse.arrayBuffer();
    const qrBase64 = btoa(String.fromCharCode(...new Uint8Array(qrBuffer)));

    const resultado = await enviarEmail({
      tipo: 'receita_digital',
      para: paciente.email,
      assunto: `Receita Digital - ${clinica.nome}`,
      variaveis: {
        paciente_nome: paciente.nome,
        clinica_nome: clinica.nome,
        medico_nome: medico?.nome || user.full_name,
        crm: medico?.crm || 'CRM/UF',
        data_prescricao: new Date(prescricao.created_date).toLocaleDateString('pt-BR'),
        medicamentos: prescricao.medicamentos?.map(m => 
          `${m.nome} - ${m.dosagem} (${m.via_administracao}) - ${m.posologia}`
        ).join('<br>') || '',
        orientacoes: prescricao.orientacoes || '',
        validade_dias: '30',
        qr_code_url: `data:image/png;base64,${qrBase64}`,
        link_validacao: qrData
      }
    });

    return Response.json(resultado);
  } catch (error) {
    console.error('[EnviarReceita] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});