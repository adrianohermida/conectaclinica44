import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * COMPLIANCE LGPD Art. 37: Popular ROPA automaticamente
 * Gera registros de tratamento baseado em entidades/módulos do sistema
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Garantir clinica_id válido
    if (!user.clinica_id) {
      return Response.json({ 
        error: 'Usuário sem clinica_id - execute como admin de clínica',
        user_email: user.email
      }, { status: 400 });
    }

    // ROPA entries por módulo do ConectaClinica
    const ropaEntries = [
      {
        clinica_id: user.clinica_id,
        operacao: 'Gestão de Prontuários Eletrônicos',
        finalidade: 'Armazenamento e gestão de prontuários médicos eletrônicos',
        base_legal: 'execucao_contrato',
        artigo_lgpd: 'Art. 7º, V',
        dados_tratados: ['Dados de saúde', 'Dados pessoais', 'Histórico médico', 'Exames', 'Prescrições'],
        categorias_titulares: ['Pacientes'],
        dados_sensiveis: true,
        compartilhamento: [{
          destinatario: 'Médicos e equipe clínica',
          finalidade: 'Atendimento médico',
          garantias: 'RBAC, logs de auditoria'
        }],
        retencao_prazo: '20 anos (CFM Resolução 1.821/2007)',
        medidas_seguranca: ['Criptografia em repouso e trânsito', 'Controle de acesso RBAC', 'Logs de auditoria'],
        responsavel: user.email,
        dpia_necessaria: true,
        status: 'ativo'
      },
      {
        clinica_id: user.clinica_id || 'global',
        operacao: 'Gestão de Agendamentos e Contatos',
        finalidade: 'Gerenciar agendamentos de consultas e dados de contato',
        base_legal: 'consentimento',
        artigo_lgpd: 'Art. 7º, I',
        dados_tratados: ['Nome', 'CPF', 'Email', 'Telefone', 'Endereço'],
        categorias_titulares: ['Pacientes', 'Leads'],
        dados_sensiveis: false,
        compartilhamento: [{
          destinatario: 'Equipe administrativa',
          finalidade: 'Agendamento de consultas',
          garantias: 'RBAC, logs'
        }],
        retencao_prazo: '5 anos após último atendimento',
        medidas_seguranca: ['Criptografia', 'RBAC', 'Índices únicos (CPF)', 'Logs'],
        responsavel: user.email,
        dpia_necessaria: false,
        status: 'ativo'
      },
      {
        clinica_id: user.clinica_id || 'global',
        operacao: 'Gestão Financeira e Faturamento',
        finalidade: 'Processar pagamentos e emitir faturas',
        base_legal: 'obrigacao_legal',
        artigo_lgpd: 'Art. 7º, II',
        dados_tratados: ['Dados financeiros', 'CPF/CNPJ', 'Dados bancários'],
        categorias_titulares: ['Pacientes', 'Clientes'],
        dados_sensiveis: false,
        compartilhamento: [{
          destinatario: 'Stripe, bancos',
          finalidade: 'Processamento de pagamentos',
          garantias: 'Criptografia E2E, tokenização'
        }],
        retencao_prazo: '5 anos (obrigação fiscal)',
        medidas_seguranca: ['Criptografia E2E', 'Tokenização de cartões', 'Logs', 'Segregação por tenant'],
        responsavel: user.email,
        dpia_necessaria: false,
        status: 'ativo'
      },
      {
        clinica_id: user.clinica_id || 'global',
        operacao: 'Autenticação e Controle de Acesso',
        finalidade: 'Autenticar usuários e controlar acessos',
        base_legal: 'execucao_contrato',
        artigo_lgpd: 'Art. 7º, V',
        dados_tratados: ['Email', 'Senha (hash)', 'Logs de acesso'],
        categorias_titulares: ['Usuários', 'Profissionais de saúde'],
        dados_sensiveis: false,
        compartilhamento: [],
        retencao_prazo: '2 anos após desativação',
        medidas_seguranca: ['Bcrypt', '2FA opcional', 'Rate limiting', 'Logs'],
        responsavel: user.email,
        dpia_necessaria: false,
        status: 'ativo'
      }
    ];

    // Limpar ROPA anterior
    const existingROPA = await base44.asServiceRole.entities.ROPA.list();
    for (const entry of existingROPA) {
      await base44.asServiceRole.entities.ROPA.delete(entry.id);
    }

    // Criar novos registros (com tratamento de erro)
    const created = [];
    for (const entry of ropaEntries) {
      try {
        const ropa = await base44.asServiceRole.entities.ROPA.create(entry);
        created.push(ropa);
      } catch (err) {
        console.error(`[popularROPAAutomatico] Erro ao criar ROPA: ${err.message}`);
        // Continuar mesmo se falhar
      }
    }

    console.log(`[popularROPAAutomatico] ✅ ${created.length} registros ROPA criados`);

    return Response.json({
      message: `ROPA populado com ${created.length} registros`,
      created: created.length,
      modulos: ropaEntries.map(e => e.modulo_sistema)
    });

  } catch (error) {
    console.error('[popularROPAAutomatico] ❌ ERRO:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});