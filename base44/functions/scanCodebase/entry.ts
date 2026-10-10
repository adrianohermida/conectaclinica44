import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * AST Collector - Escaneia codebase e extrai rotas/componentes/entities
 * TODO: Integrar ts-morph real quando Deno Deploy suportar
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // FASE 1: Mapa estático expandido (depois evoluir para AST real)
    const discovered = {
      routes: [
        { path: '/DashboardCompleto', module: 'dashboard', guards: ['RouteGuard', 'ModuloGuard:dashboard'], components: ['StatCard', 'ChartRevenue'] },
        { path: '/Agenda', module: 'agenda', guards: ['RouteGuard', 'ModuloGuard:agenda'], components: ['AgendamentoQuickForm', 'CalendarioDisponibilidade'] },
        { path: '/Pacientes', module: 'pacientes', guards: ['RouteGuard', 'ModuloGuard:pacientes'], components: ['ContactHeader', 'SearchBar'] },
        { path: '/Prontuarios', module: 'prontuarios', guards: ['RouteGuard', 'ModuloGuard:prontuarios'], components: ['ProntuarioForm'] },
        { path: '/Produtos', module: 'produtos', guards: ['RouteGuard', 'ModuloGuard:produtos'], components: [] },
        { path: '/Estoque', module: 'estoque', guards: ['RouteGuard', 'ModuloGuard:estoque'], components: ['CodigoBarrasScanner'] },
        { path: '/Financeiro', module: 'financeiro', guards: ['RouteGuard', 'ModuloGuard:financeiro'], components: ['RelatorioFinanceiro'] },
        { path: '/Atendimento', module: 'atendimento', guards: ['RouteGuard'], components: ['TicketsCounter'] },
        { path: '/SuperAdmin', module: 'superadmin', guards: ['RouteGuard', 'role:admin'], components: [] },
        { path: '/MapaRotas', module: 'plataforma', guards: ['RouteGuard', 'role:admin'], components: ['GraphCanvas', 'InspectorPanel'] }
      ],
      entities: ['Agendamento', 'Contato', 'Prontuario', 'Produto', 'Venda', 'Ticket', 'RouteNode', 'RouteEdge', 'RouteIssue'],
      modules: {
        dashboard: { pages: ['DashboardCompleto'], entities: ['Agendamento', 'Contato', 'Venda'], queries: ['dashboard-data'] },
        agenda: { pages: ['Agenda'], entities: ['Agendamento', 'Contato', 'Medico'], queries: ['agenda-data'] },
        pacientes: { pages: ['Pacientes', 'ContatoDetalhes'], entities: ['Contato'], queries: ['pacientes-data'] },
        prontuarios: { pages: ['Prontuarios'], entities: ['Prontuario', 'DocumentoPaciente'], queries: ['prontuarios-data'] },
        atendimento: { pages: ['Atendimento'], entities: ['Ticket', 'MensagemTicket'], queries: ['atendimento-data'] }
      }
    };

    return Response.json({
      success: true,
      routes: discovered.routes,
      entities: discovered.entities,
      modules: discovered.modules,
      note: 'Fase 1: Mapa estático. TODO: Integrar ts-morph AST parser real'
    });

  } catch (error) {
    console.error('[scanCodebase] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});