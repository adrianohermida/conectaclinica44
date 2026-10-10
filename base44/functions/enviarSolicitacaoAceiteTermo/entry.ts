import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { enviarEmailSendGrid } from './services/emailService.js';

/**
 * SPRINT 4: Solicitar aceite termo legal obrigatório
 * Trigger: TermoLegal.obrigatorio = true criado/atualizado
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admin' }, { status: 401 });
    }

    const { termo_id, clinica_id } = await req.json();
    const targetClinica = clinica_id || user.clinica_id;

    // Buscar termo legal
    const termos = await base44.entities.TermoLegal.filter({ id: termo_id });
    if (termos.length === 0) {
      return Response.json({ error: 'Termo não encontrado' }, { status: 404 });
    }

    const termo = termos[0];

    if (!termo.obrigatorio) {
      return Response.json({ 
        success: false, 
        detalhes: 'Termo não é obrigatório - sem envio'
      });
    }

    const clinica = await base44.entities.Clinica.filter({ id: targetClinica })[0];

    // Buscar usuários que ainda não aceitaram
    const aceites = await base44.entities.AceiteTermoLegal.filter({
      termo_id: termo_id,
      status: 'aceito'
    });

    const usuariosAceitaram = aceites.map(a => a.usuario_email);
    const todosUsuarios = await base44.entities.User.filter({ clinica_id: targetClinica });
    const pendentes = todosUsuarios.filter(u => !usuariosAceitaram.includes(u.email));

    const enviados = [];

    for (const usuario of pendentes) {
      const prazo = termo.prazo_aceite_dias || 15;
      
      await enviarEmailSendGrid({
        base44,
        clinica_id: targetClinica,
        template_tipo: 'termo_pendente',
        destinatario: usuario.email,
        vars: {
          usuario_nome: usuario.full_name,
          termo_titulo: termo.titulo,
          termo_descricao: termo.descricao || 'Termo legal obrigatório',
          link_aceite: `https://app.conectaclinica.com.br/termos/aceitar/${termo_id}`,
          prazo_dias: prazo,
          clinica_nome: clinica?.nome || 'ConectaClínica'
        }
      });

      enviados.push(usuario.email);
    }

    return Response.json({
      success: true,
      total_usuarios: todosUsuarios.length,
      ja_aceitaram: usuariosAceitaram.length,
      enviados: enviados.length,
      detalhes: enviados
    });

  } catch (error) {
    console.error('[SolicitarAceiteTermo] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});