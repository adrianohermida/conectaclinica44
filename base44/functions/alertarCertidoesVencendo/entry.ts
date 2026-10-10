import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { enviarEmailSendGrid } from './services/emailService.js';

/**
 * SPRINT 4: Alertar certidões vencendo 7 dias
 * MANUAL: Admin clica "Verificar Certidões" (vs CRON diário)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admin' }, { status: 401 });
    }

    const { clinica_id } = await req.json();
    const targetClinica = clinica_id || user.clinica_id;

    const hoje = new Date();
    const seteDias = new Date(hoje);
    seteDias.setDate(hoje.getDate() + 7);

    // Buscar certidões vencendo
    const certidoes = await base44.entities.CertidaoRegularidade.filter({
      clinica_id: targetClinica,
      status: 'regular',
      data_validade: { 
        $lte: seteDias.toISOString().split('T')[0],
        $gte: hoje.toISOString().split('T')[0]
      }
    });

    if (certidoes.length === 0) {
      return Response.json({ 
        success: true, 
        alertas: 0,
        detalhes: 'Sem certidões vencendo'
      });
    }

    const clinica = await base44.entities.Clinica.filter({ id: targetClinica })[0];
    const admins = await base44.entities.User.filter({ 
      clinica_id: targetClinica, 
      role: 'admin' 
    });

    for (const admin of admins) {
      for (const certidao of certidoes) {
        const diasRestantes = Math.ceil(
          (new Date(certidao.data_validade) - hoje) / (1000 * 60 * 60 * 24)
        );

        await enviarEmailSendGrid({
          base44,
          clinica_id: targetClinica,
          template_tipo: 'certidao_vence',
          destinatario: admin.email,
          vars: {
            admin_nome: admin.full_name,
            certidao_tipo: certidao.tipo_certidao,
            orgao_emissor: certidao.orgao_emissor,
            dias_restantes: diasRestantes,
            data_vencimento: new Date(certidao.data_validade).toLocaleDateString('pt-BR'),
            link_renovar: `https://app.conectaclinica.com.br/compliance/certidoes/${certidao.id}`,
            clinica_nome: clinica?.nome || 'ConectaClínica'
          }
        });
      }
    }

    return Response.json({
      success: true,
      certidoes_vencendo: certidoes.length,
      admins_notificados: admins.length
    });

  } catch (error) {
    console.error('[AlertarCertidoes] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});