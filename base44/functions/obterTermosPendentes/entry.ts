import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * P0.9 FIX: Query N+1 otimizada
 * Retorna termos pendentes já filtrados (1 query backend)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pathname } = await req.json();

    // Mapear pathname para módulo
    const moduloMap = {
      '/DashboardCompleto': 'dashboard',
      '/Pacientes': 'pacientes',
      '/Prontuarios': 'prontuarios',
      '/Agenda': 'agenda',
      '/Financeiro': 'financeiro',
      '/Atendimento': 'atendimento',
      '/Administracao': 'administracao'
    };

    const moduloAtual = moduloMap[pathname] || 'global';

    console.log('[obterTermosPendentes] 🔍 User:', user.id, user.email);
    console.log('[obterTermosPendentes] 📍 Pathname:', pathname, '→ Módulo:', moduloAtual);
    
    // Buscar aceites do user PRIMEIRO (FIX: usuario_email NÃO bloqueado por RBAC)
    const aceites = await base44.entities.AceiteTermoLegal.filter({
      usuario_email: user.email,
      aceito: true
    });
    
    console.log('[obterTermosPendentes] 📊 Aceites encontrados:', aceites.length);
    
    // Dedupe aceites (mesmo termo aceito múltiplas vezes = BUG)
    const aceitesMap = new Map();
    aceites.forEach(a => {
      const termoId = a.termo_legal_id || a.termo_id;
      if (!aceitesMap.has(termoId)) {
        aceitesMap.set(termoId, a);
      }
    });
    
    const termosAceitos = new Set(aceitesMap.keys());
    console.log('[obterTermosPendentes] ✅ Termos únicos aceitos:', termosAceitos.size);
    
    // Buscar termos ativos
    const termosAtivos = await base44.entities.ConteudoLegal.filter({ ativo: true });
    console.log('[obterTermosPendentes] 📋 Termos ativos:', termosAtivos.length);

    // Filtrar pendentes
    const termosPendentes = termosAtivos.filter(t => {
      if (termosAceitos.has(t.id)) {
        console.log('[obterTermosPendentes] ⏭️ Pular (já aceito):', t.tipo_documento, t.id);
        return false;
      }

      // Filtro por módulo
      if (t.modulo_aplicacao === 'global') return true;
      if (t.modulo_aplicacao === moduloAtual) return true;

      return false;
    });
    
    console.log('[obterTermosPendentes] 🎯 Pendentes:', termosPendentes.length);

    return Response.json({ 
      termos_pendentes: termosPendentes,
      total: termosPendentes.length,
      aceitos_count: aceitesMap.size
    });

  } catch (error) {
    console.error('Erro ao obter termos pendentes:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});