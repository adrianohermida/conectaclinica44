import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CORREÇÃO AUTOMÁTICA DE VAZAMENTOS MULTI-TENANT
 * 
 * Aplica fixes para vulnerabilidades detectadas:
 * 1. Limpa registros órfãos (sem clinica_id)
 * 2. Define roles padrão para users sem role
 * 3. Implementa validação em queries críticas
 * 
 * IMPORTANTE: Executar APÓS auditoria confirmar problemas
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // APENAS ADMIN pode executar correções
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { modo = 'dry_run', entidades = [] } = body || {};

    console.log('[CORREÇÃO] ========== INÍCIO ==========');
    console.log('[CORREÇÃO] Modo:', modo);
    const acoes = [];

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FIX 1: LIMPAR REGISTROS ÓRFÃOS (sem clinica_id)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const entidadesMultiTenant = entidades.length > 0 ? entidades : [
      'Contato', 'Agendamento', 'Prontuario', 'Ticket'
    ];

    for (const entidade of entidadesMultiTenant) {
      try {
        console.log(`[CORREÇÃO] Processando ${entidade}...`);
        
        // Buscar registros sem clinica_id
        const registros = await base44.asServiceRole.entities[entidade].filter({});
        const orfaos = registros.filter(r => !r.clinica_id);

        if (orfaos.length > 0) {
          console.log(`[CORREÇÃO] Encontrados ${orfaos.length} registros órfãos em ${entidade}`);

          if (modo === 'execute') {
            // ESTRATÉGIA: Deletar registros órfãos (não há como saber de qual clínica são)
            for (const registro of orfaos) {
              await base44.asServiceRole.entities[entidade].delete(registro.id);
            }
            
            acoes.push({
              tipo: 'LIMPEZA',
              entidade,
              acao: 'Deletados registros órfãos',
              quantidade: orfaos.length
            });
          } else {
            acoes.push({
              tipo: 'LIMPEZA',
              entidade,
              acao: 'DRY RUN - Registros órfãos detectados (seriam deletados)',
              quantidade: orfaos.length
            });
          }
        }
      } catch (error) {
        acoes.push({
          tipo: 'ERRO',
          entidade,
          erro: error.message
        });
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FIX 2: DEFINIR ROLE PADRÃO PARA USERS SEM ROLE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    try {
      const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
      const usersSemRole = users.filter(u => !u.role);

      if (usersSemRole.length > 0) {
        console.log(`[CORREÇÃO] Encontrados ${usersSemRole.length} users sem role`);

        if (modo === 'execute') {
          for (const u of usersSemRole) {
            await base44.asServiceRole.entities.User.update(u.id, { role: 'user' });
          }

          acoes.push({
            tipo: 'RBAC',
            acao: 'Definida role padrão "user"',
            quantidade: usersSemRole.length
          });
        } else {
          acoes.push({
            tipo: 'RBAC',
            acao: 'DRY RUN - Users sem role detectados (receberiam role "user")',
            quantidade: usersSemRole.length
          });
        }
      }
    } catch (error) {
      acoes.push({
        tipo: 'ERRO',
        acao: 'RBAC',
        erro: error.message
      });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FIX 3: VALIDAR CONFIGURAÇÕES DE EMAIL DUPLICADAS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    try {
      const configsEmail = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({});
      const duplicadas = {};
      
      configsEmail.forEach(config => {
        const key = config.sender_email;
        if (!duplicadas[key]) duplicadas[key] = [];
        duplicadas[key].push(config);
      });

      const conflitos = Object.entries(duplicadas).filter(([_, configs]) => configs.length > 1);

      if (conflitos.length > 0) {
        console.log(`[CORREÇÃO] Encontrados ${conflitos.length} conflitos de sender_email`);

        if (modo === 'execute') {
          // Manter apenas a config mais recente por email
          for (const [email, configs] of conflitos) {
            const maisRecente = configs.sort((a, b) => 
              new Date(b.created_date) - new Date(a.created_date)
            )[0];

            const paraRemover = configs.filter(c => c.id !== maisRecente.id);
            
            for (const config of paraRemover) {
              await base44.asServiceRole.entities.ConfiguracaoEmail.delete(config.id);
            }
          }

          acoes.push({
            tipo: 'EMAIL_ISOLATION',
            acao: 'Removidas configurações duplicadas',
            quantidade: conflitos.length
          });
        } else {
          acoes.push({
            tipo: 'EMAIL_ISOLATION',
            acao: 'DRY RUN - Configurações duplicadas detectadas (mais antigas seriam removidas)',
            quantidade: conflitos.length
          });
        }
      }
    } catch (error) {
      acoes.push({
        tipo: 'ERRO',
        acao: 'EMAIL_ISOLATION',
        erro: error.message
      });
    }

    console.log('[CORREÇÃO] ========== FIM ==========');

    return Response.json({
      modo,
      acoes,
      resumo: {
        total_acoes: acoes.length,
        executadas: modo === 'execute',
        proximo_passo: modo === 'dry_run' 
          ? 'Execute novamente com modo="execute" para aplicar correções'
          : 'Correções aplicadas - Execute auditoria novamente para validar'
      }
    });

  } catch (error) {
    console.error('[CORREÇÃO] ERRO FATAL:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});