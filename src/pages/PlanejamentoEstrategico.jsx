import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
import RouteGuard from "@/components/auth/RouteGuard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { 
  Target, CheckCircle2, Loader2, AlertCircle, DollarSign, Shield,
  TrendingUp, Eye, Play, RefreshCw, Plus, Edit2, Trash2, Save, X, Calendar, Star
} from "lucide-react";
import { toast } from "sonner";
import AuditoriaConclusao from "@/components/planejamento/AuditoriaConclusao";
import SidebarAgenteCompliance from "@/components/planejamento/SidebarAgenteCompliance";
import ChecklistTecnico from "@/components/planejamento/ChecklistTecnico";
import SprintBreakdown from "@/components/planejamento/SprintBreakdown";
import RecursosBase44Checklist from "@/components/planejamento/RecursosBase44Checklist";
import DiffCodebase from "@/components/planejamento/DiffCodebase";
import TemplateModuloEstruturado from "@/components/planejamento/TemplateModuloEstruturado";
import AnaliseRefatoramento from "@/components/planejamento/AnaliseRefatoramento";
import ArvoreTecnicaModulo from "@/components/planejamento/ArvoreTecnicaModulo";
import ExportModuloCompleto from "@/components/planejamento/ExportModuloCompleto";
import ModalRenomearModulo from "@/components/planejamento/ModalRenomearModulo";

export default function PlanejamentoEstrategico() {
  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  const { data: checklist = [], isLoading } = useQuery({
    queryKey: ["checklist-projeto"],
    queryFn: () => base44.entities.ChecklistProjeto.list("-deadline", 500),
    enabled: user?.role === 'admin',
    staleTime: 10000
  });

  const [filtroStatus, setFiltroStatus] = useState(null);
  const [filtroPrioridade, setFiltroPrioridade] = useState(null);
  const [filtroCategoria, setFiltroCategoria] = useState(null);
  const [filtroSemDeadline, setFiltroSemDeadline] = useState(false);
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState(null);
  const [criando, setCriando] = useState(false);
  const [formData, setFormData] = useState({});
  const [auditando, setAuditando] = useState(false);
  const [itemAuditoria, setItemAuditoria] = useState(null);
  const [gerandoPrompt, setGerandoPrompt] = useState(false);
  const [promptGerado, setPromptGerado] = useState(null);
  const [itemPrompt, setItemPrompt] = useState(null);
  const [otimizando, setOtimizando] = useState(false);
  const [sidebarAgenteAberto, setSidebarAgenteAberto] = useState(false);
  const [modoTemplateEstruturado, setModoTemplateEstruturado] = useState(false);
  const [previewsRefatoramento, setPreviewsRefatoramento] = useState({});
  const [analisesPendentes, setAnalisesPendentes] = useState({});
  const [itemRenomear, setItemRenomear] = useState(null);

  const queryClient = useQueryClient();

  // POLLING: Verificar análises em background
  useEffect(() => {
    const itemsProcessando = checklist.filter(i => i.status_analise_completa === 'processing');
    
    if (itemsProcessando.length === 0) return;

    const interval = setInterval(async () => {
      try {
        const updates = await Promise.all(
          itemsProcessando.map(i => base44.entities.ChecklistProjeto.filter({ id: i.id }))
        );
        
        updates.forEach((result, idx) => {
          const item = result[0];
          const itemOriginal = itemsProcessando[idx];
          
          if (item.status_analise_completa === 'completed' && itemOriginal.status_analise_completa === 'processing') {
            queryClient.invalidateQueries(["checklist-projeto"]);
            toast.success(`✅ ${item.modulo} - Análise completa! Score: ${item.score_checklist}%`, { 
              duration: 10000,
              action: {
                label: 'Recarregar',
                onClick: () => window.location.reload()
              }
            });
          } else if (item.status_analise_completa === 'error' && itemOriginal.status_analise_completa === 'processing') {
            queryClient.invalidateQueries(["checklist-projeto"]);
            toast.error(`❌ ${item.modulo} - Erro: ${item.analise_erro}`);
          }
        });
      } catch (error) {
        console.error('[polling] erro:', error);
      }
    }, 8000); // Verificar a cada 8s

    return () => clearInterval(interval);
  }, [checklist, queryClient]);

  const itensFiltrados = useMemo(() => {
    let items = [...checklist];

    if (filtroSemDeadline) {
      items = items.filter(i => !i.deadline && i.status !== 'completo');
    }
    if (filtroStatus) {
      items = items.filter(i => i.status === filtroStatus);
    }
    if (filtroPrioridade) {
      items = items.filter(i => i.prioridade === filtroPrioridade);
    }
    if (filtroCategoria) {
      items = items.filter(i => i.categoria === filtroCategoria);
    }
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      items = items.filter(i => 
        i.modulo?.toLowerCase().includes(termo) ||
        i.funcionalidade?.toLowerCase().includes(termo) ||
        i.observacoes?.toLowerCase().includes(termo)
      );
    }

    return items.sort((a, b) => {
      const prioMap = { critica: 0, alta: 1, media: 2, baixa: 3 };
      const statusMap = { bloqueado: 0, pendente: 1, em_progresso: 2, completo: 3 };
      if (statusMap[a.status] !== statusMap[b.status]) {
        return statusMap[a.status] - statusMap[b.status];
      }
      return prioMap[a.prioridade] - prioMap[b.prioridade];
    });
  }, [checklist, filtroStatus, filtroPrioridade, filtroCategoria, filtroSemDeadline, busca]);

  const metricas = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return {
      total: checklist.length,
      completos: checklist.filter(i => i.status === 'completo').length,
      pendentes: checklist.filter(i => i.status === 'pendente').length,
      em_progresso: checklist.filter(i => i.status === 'em_progresso').length,
      bloqueados: checklist.filter(i => i.status === 'bloqueado').length,
      feature_futura: checklist.filter(i => i.status === 'feature_futura').length,
      sem_deadline: checklist.filter(i => !i.deadline && i.status !== 'completo').length,
      atrasados: checklist.filter(i => {
        if (i.status === 'completo' || !i.deadline) return false;
        return new Date(i.deadline) < hoje;
      }).length,
      fake_dones: checklist.filter(i => i.status === 'completo' && i.score_checklist < 100 && !i.tags?.includes('feature_futura')).length
    };
  }, [checklist]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ChecklistProjeto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["checklist-projeto"]);
      toast.success("Item criado");
      setCriando(false);
      setFormData({});
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChecklistProjeto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["checklist-projeto"]);
      toast.success("Atualizado");
      setEditando(null);
      setFormData({});
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ChecklistProjeto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["checklist-projeto"]);
      toast.success("Deletado");
    }
  });

  const adicionarDeadlinesMutation = useMutation({
    mutationFn: () => base44.functions.invoke('adicionarDeadlinesAutomatico', {}),
    onSuccess: (response) => {
      queryClient.invalidateQueries(["checklist-projeto"]);
      const resumo = response.data.resumo;
      toast.success(`${response.data.total_atualizado} deadlines adicionados: ${resumo.critica} críticos, ${resumo.alta} altos, ${resumo.media} médios, ${resumo.baixa} baixos`);
    }
  });

  const executarAuditoria = async () => {
    setAuditando(true);
    try {
      toast.loading('🔍 Escaneando TODO o codebase + validando evidências...', { id: 'audit' });
      
      // 1. Escanear cada item com evidências
      const itensComEvidencias = checklist.filter(i => i.evidencias?.length > 0);
      let itensAtualizados = 0;
      let fakeDones = 0;
      
      for (const item of itensComEvidencias) {
        try {
          const scanResponse = await base44.functions.invoke('escanearCodebase', {
            item_id: item.id
          });
          
          const scoreReal = scanResponse.data.score_real;
          const scoreDeclarado = item.score_checklist || 0;
          
          // Atualizar score real
          await base44.entities.ChecklistProjeto.update(item.id, {
            score_checklist: scoreReal
          });
          
          itensAtualizados++;
          
          // Detectar fake-done
          if (item.status === 'completo' && scoreReal < 100 && !item.tags?.includes('feature_futura')) {
            fakeDones++;
            // Reverter para em_progresso
            await base44.entities.ChecklistProjeto.update(item.id, {
              status: 'em_progresso'
            });
          }
        } catch (err) {
          console.error(`Erro ao auditar ${item.modulo}:`, err);
        }
      }
      
      queryClient.invalidateQueries(["checklist-projeto"]);
      
      const scoreGeral = Math.round((itensComEvidencias.reduce((sum, i) => sum + (i.score_checklist || 0), 0) / (itensComEvidencias.length || 1)));
      
      if (scoreGeral < 50) {
        toast.error(`💀 ${scoreGeral}% - ${itensAtualizados} itens auditados`, {
          id: 'audit',
          description: `${fakeDones} fake-dones revertidos para "em_progresso"`,
          duration: 8000
        });
      } else if (scoreGeral < 80) {
        toast.warning(`🔴 ${scoreGeral}% - ${itensAtualizados} itens auditados`, {
          id: 'audit',
          description: `${fakeDones} fake-dones corrigidos`,
          duration: 6000
        });
      } else {
        toast.success(`✅ ${scoreGeral}% - ${itensAtualizados} itens validados`, {
          id: 'audit',
          duration: 4000
        });
      }
      
    } catch (error) {
      toast.error('Erro na auditoria: ' + error.message, { id: 'audit' });
    } finally {
      setAuditando(false);
    }
  };

  const gerarPromptIA = async (item) => {
    setGerandoPrompt(true);
    setItemPrompt(item);
    try {
      toast.loading('Gerando diagnóstico brutal...', { id: 'prompt' });
      
      // SCAN CÓDIGO REAL ANTES
      let scanData = item.ultimo_scan_codebase;
      if (!scanData) {
        const scanResp = await base44.functions.invoke('escanearCodebase', { item_id: item.id });
        scanData = scanResp.data;
      }
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um arquiteto BRUTAL de software médico.

━━━ MÓDULO ATUAL ━━━
Nome: ${item.modulo}
Funcionalidade: ${item.funcionalidade}
Categoria: ${item.categoria}
Status: ${item.status}
Deadline: ${item.deadline || 'SEM DEADLINE'}

━━━ SCAN CÓDIGO REAL ━━━
Score Real: ${scanData.score_real}%
Evidências: ${scanData.evidencias_validadas}/${scanData.total_evidencias}
Faltando: ${JSON.stringify(scanData.faltando)}

━━━ BLOQUEADORES ━━━
${item.bloqueadores?.join('\n') || 'Nenhum'}

━━━ TAREFA ━━━

Gere DIAGNÓSTICO BRUTAL + PROMPT EXECUTÁVEL com:

1. DIAGNÓSTICO ESTRUTURADO (score 0-100):
   - Gaps de arquitetura
   - Componentes faltantes
   - Integrações necessárias
   - Riscos técnicos

2. ROADMAP DETALHADO:
   - Entities necessárias (JSON schemas completos)
   - Pages/Components (estrutura, props, hooks)
   - Backend functions (integrações, validações)
   - Ordem de implementação

3. CONTRATO MÍNIMO (Definition of Done):
   - Critérios mensuráveis
   - Testes obrigatórios
   - Métricas de sucesso

4. META ESPERADA:
   - Performance (latência P95)
   - Cobertura de testes
   - Compliance (CFM, LGPD)

5. RECURSOS ESPERADOS PARA O NICHO:
   - Funcionalidades padrão do mercado
   - Diferenciais competitivos
   - Integrações críticas

Retorne JSON com estrutura detalhada e prompt executável.`,
        response_json_schema: {
          type: "object",
          properties: {
            score_eficiencia: { type: "number" },
            diagnostico: {
              type: "object",
              properties: {
                gaps_arquitetura: { type: "array", items: { type: "string" } },
                componentes_faltantes: { type: "array", items: { type: "string" } },
                integracoes_necessarias: { type: "array", items: { type: "string" } },
                riscos_tecnicos: { type: "array", items: { type: "string" } }
              }
            },
            roadmap: {
              type: "object",
              properties: {
                entities: { type: "array", items: { type: "object" } },
                pages_components: { type: "array", items: { type: "string" } },
                backend_functions: { type: "array", items: { type: "string" } },
                ordem_implementacao: { type: "array", items: { type: "string" } }
              }
            },
            contrato_minimo: {
              type: "object",
              properties: {
                criterios: { type: "array", items: { type: "string" } },
                testes: { type: "array", items: { type: "string" } },
                metricas: { type: "array", items: { type: "string" } }
              }
            },
            meta_esperada: {
              type: "object",
              properties: {
                performance: { type: "string" },
                cobertura_testes: { type: "string" },
                compliance: { type: "array", items: { type: "string" } }
              }
            },
            recursos_nicho: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  recurso: { type: "string" },
                  prioridade: { type: "string" },
                  diferencial: { type: "boolean" }
                }
              }
            },
            prompt_execucao_completo: { type: "string" },
            evidencias_sugeridas: { type: "array", items: { type: "string" } },
            requisitos_externos_sugeridos: { type: "array", items: { type: "string" } },
            gaps_criticos_count: { type: "number" },
            debitos_tecnicos_criticos: { type: "array", items: { type: "string" } }
          }
        }
      });

      // SALVAR (memória)
      const historicoAnalises = item.historico_analises || [];
      historicoAnalises.push({
        timestamp: new Date().toISOString(),
        tipo: 'prompt_ia_diagnostico',
        resultado: {
          score_eficiencia: response.score_eficiencia,
          gaps_count: response.diagnostico.gaps_arquitetura?.length || 0
        }
      });
      
      await base44.entities.ChecklistProjeto.update(item.id, {
        historico_analises: historicoAnalises
      });

      setPromptGerado(response);
      toast.success(`Diagnóstico: ${response.score_eficiencia}% - ${response.gaps_criticos_count || 0} gaps críticos`, { id: 'prompt' });
    } catch (error) {
      toast.error('Erro: ' + error.message, { id: 'prompt' });
    } finally {
      setGerandoPrompt(false);
    }
  };

  // PREVIEW RÁPIDO DE REFATORAMENTO (cache local)
  const gerarPreviewRefatoramento = async (itemId) => {
    if (previewsRefatoramento[itemId]) return;
    
    try {
      const response = await base44.functions.invoke('analisarRefatoramentoBrutal', {
        item_id: itemId
      });
      
      const analise = response.data.analise;
      
      setPreviewsRefatoramento(prev => ({
        ...prev,
        [itemId]: {
          percentual: analise.recomendacao_percentual || analise.roi_score || 0,
          comentario: analise.comentario_destaque || analise.justificativa_brutal?.substring(0, 100),
          recomendacao: analise.recomendacao,
          score_atual: analise.score_atual,
          score_esperado: analise.score_esperado
        }
      }));
    } catch (error) {
      console.error('Erro preview:', error);
    }
  };

  // ACEITAR REFATORAMENTO
  const aceitarRefatoramento = async (itemId, analiseCompleta) => {
    try {
      const template = analiseCompleta.template_ideal;
      
      const observacoesEstruturadas = `
━━━ REFATORAÇÃO APROVADA (${new Date().toISOString()}) ━━━
ROI: ${analiseCompleta.roi_score}%
Score: ${analiseCompleta.score_atual}% → ${analiseCompleta.score_esperado}%

═══ ENTITIES ═══
${template.entities?.map(e => `✓ ${e.name} - ${e.descricao}`).join('\n')}

═══ FUNCTIONS ═══
${template.functions?.map(f => `✓ ${f.name} - ${f.descricao}`).join('\n')}

═══ PAGES ═══
${template.pages?.map(p => `✓ ${p.name} (${p.componentes?.length || 0} componentes)`).join('\n')}

═══ PERFORMANCE (Base44 Benchmarks) ═══
- LCP: < ${template.performance_targets?.lcp_seconds}s
- CLS: < ${template.performance_targets?.cls_score}
- INP: < ${template.performance_targets?.p95_latency_ms}ms
- Bundle: < ${template.performance_targets?.bundle_size_kb}kb

═══ TESTES E2E ═══
${template.testes_e2e?.map(t => `• ${t}`).join('\n')}
`;

      await updateMutation.mutateAsync({
        id: itemId,
        data: {
          observacoes: observacoesEstruturadas,
          evidencias: [
            ...template.entities?.map(e => `entities/${e.name}.json`) || [],
            ...template.functions?.map(f => `functions/${f.name}.js`) || [],
            ...template.pages?.map(p => `pages/${p.name}.jsx`) || []
          ],
          definition_of_done: template.testes_e2e || [],
          tags: [...(checklist.find(i => i.id === itemId)?.tags || []), 'refatoracao_aprovada'],
          status: 'em_progresso'
        }
      });
      
      toast.success('✅ Refatoração aprovada - Template aplicado');
      setAnalisesPendentes(prev => ({ ...prev, [itemId]: null }));
    } catch (error) {
      toast.error('Erro: ' + error.message);
    }
  };

  // REJEITAR REFATORAMENTO
  const rejeitarRefatoramento = async (itemId, motivo) => {
    try {
      const itemAtual = checklist.find(i => i.id === itemId);
      
      await updateMutation.mutateAsync({
        id: itemId,
        data: {
          observacoes: `${itemAtual.observacoes || ''}\n\n━━━ REFATORAÇÃO REJEITADA (${new Date().toISOString()}) ━━━\nMotivo: ${motivo}\nDecisão: MANTER código atual\n`,
          tags: [...(itemAtual?.tags || []), 'refatoracao_rejeitada']
        }
      });
      
      toast.success('Refatoração rejeitada');
      setAnalisesPendentes(prev => ({ ...prev, [itemId]: null }));
    } catch (error) {
      toast.error('Erro: ' + error.message);
    }
  };

  // ⭐ ANÁLISE COMPLETA ASSÍNCRONA - Backend Job
  const iniciarAnaliseCompleta = async (itemId) => {
    try {
      toast.loading('⭐ Iniciando análise completa...', { id: `async-${itemId}` });
      
      await base44.functions.invoke('executarAnaliseCompletaAsync', { item_id: itemId });
      
      toast.success('Análise iniciada! Aguarde ~2 min (polling automático)...', { 
        id: `async-${itemId}`, 
        duration: 8000 
      });
      
      queryClient.invalidateQueries(["checklist-projeto"]);
      
    } catch (error) {
      toast.error('Erro ao iniciar: ' + error.message, { id: `async-${itemId}` });
    }
  };

  const aceitarInsights = async () => {
    if (!promptGerado || !itemPrompt) return;
    
    const updateData = {
      observacoes: promptGerado.prompt_execucao_completo,
      evidencias: promptGerado.evidencias_sugeridas || [],
      requisitos_externos: promptGerado.requisitos_externos_sugeridos || [],
      definition_of_done: promptGerado.contrato_minimo?.criterios || [],
      prioridade: promptGerado.score_eficiencia < 40 ? 'critica' : itemPrompt.prioridade
    };

    await updateMutation.mutateAsync({ id: itemPrompt.id, data: updateData });
    setPromptGerado(null);
    setItemPrompt(null);
    toast.success('Insights aplicados');
  };

  const otimizarOrdemExecucao = async () => {
    setOtimizando(true);
    try {
      toast.loading('Aplicando deadlines por prioridade...', { id: 'otimizar' });
      const response = await base44.functions.invoke('otimizarOrdemExecucao', {});
      const result = response.data;
      
      queryClient.invalidateQueries(["checklist-projeto"]);
      
      if (result.sucesso) {
        toast.success(`✅ ${result.aplicados} deadlines aplicados`, { 
          id: 'otimizar',
          description: `${result.resumo.bloqueados} bloqueados, ${result.resumo.criticos} críticos priorizados`
        });
      } else {
        toast.warning(`⚠️ ${result.aplicados}/${result.total_processado} aplicados (${result.erros_count} erros)`, { id: 'otimizar' });
      }
    } catch (error) {
      toast.error('Erro: ' + error.message, { id: 'otimizar' });
    } finally {
      setOtimizando(false);
    }
  };



  const handleSave = async () => {
    if (!formData.modulo || !formData.funcionalidade || !formData.deadline) {
      toast.error("Módulo, Funcionalidade e Deadline obrigatórios");
      return;
    }
    
    // VALIDAÇÃO BACKEND: bloquear completo se score < 100 sem tag
    if (formData.status === 'completo' && editando) {
      try {
        const validacao = await base44.functions.invoke('validarConclusaoModulo', {
          item_id: editando,
          novo_status: 'completo'
        });
        
        if (!validacao.data.permitido) {
          toast.error(validacao.data.motivo, { duration: 8000 });
          return;
        }
      } catch (error) {
        toast.error('Erro validação: ' + error.message);
        return;
      }
    }
    
    if (editando) {
      updateMutation.mutate({ id: editando, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <RouteGuard requireAuth>
        <PageHeader title="Acesso Negado" />
        <div className="pc-card p-8 text-center">
          <p className="text-red-600">Apenas SuperAdmin</p>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth>
      <div className="space-y-6">
        <PageHeader
          title="Planejamento Estratégico"
          description="Roadmap executável com deadlines obrigatórios e auditoria de código"
          action={
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => { 
                  setCriando(true); 
                  setModoTemplateEstruturado(true); 
                }} 
                className="bg-purple-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo
              </Button>
              <Button onClick={executarAuditoria} disabled={auditando} className="bg-red-600 hover:bg-red-700">
                {auditando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                Auditar
              </Button>
              {metricas.sem_deadline > 0 && (
                <Button onClick={() => adicionarDeadlinesMutation.mutate()} disabled={adicionarDeadlinesMutation.isPending} className="bg-orange-600">
                  {adicionarDeadlinesMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calendar className="w-4 h-4 mr-2" />}
                  +Deadlines
                </Button>
              )}
            </div>
          }
        />

        {/* MÉTRICAS CLICÁVEIS */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <MetricCard label="Total" value={metricas.total} color="#0B7A9E" />
          <MetricCard 
            label="Completos" 
            value={metricas.completos} 
            color="#34a853" 
            onClick={() => setFiltroStatus(filtroStatus === 'completo' ? null : 'completo')}
            active={filtroStatus === 'completo'}
          />
          <MetricCard 
            label="Pendentes" 
            value={metricas.pendentes} 
            color="#f59e0b" 
            onClick={() => setFiltroStatus(filtroStatus === 'pendente' ? null : 'pendente')}
            active={filtroStatus === 'pendente'}
          />
          <MetricCard 
            label="Em Progresso" 
            value={metricas.em_progresso} 
            color="#0B7A9E" 
            onClick={() => setFiltroStatus(filtroStatus === 'em_progresso' ? null : 'em_progresso')}
            active={filtroStatus === 'em_progresso'}
          />
          <MetricCard 
            label="Bloqueados" 
            value={metricas.bloqueados} 
            color="#ea4335" 
            onClick={() => setFiltroStatus(filtroStatus === 'bloqueado' ? null : 'bloqueado')}
            active={filtroStatus === 'bloqueado'}
          />
          <MetricCard 
            label="Sem Deadline" 
            value={metricas.sem_deadline} 
            color="#ea4335" 
            onClick={() => setFiltroSemDeadline(!filtroSemDeadline)}
            active={filtroSemDeadline}
            urgente
          />
          <MetricCard 
            label="Atrasados" 
            value={metricas.atrasados} 
            color="#c5221f" 
            urgente
          />
          <MetricCard 
            label="Feature Futura" 
            value={metricas.feature_futura} 
            color="#9333ea"
            onClick={() => setFiltroStatus(filtroStatus === 'feature_futura' ? null : 'feature_futura')}
            active={filtroStatus === 'feature_futura'}
          />
          {metricas.fake_dones > 0 && (
            <MetricCard 
              label="Fake Dones" 
              value={metricas.fake_dones} 
              color="#991b1b" 
              urgente
            />
          )}
        </div>

        {/* FILTROS RÁPIDOS */}
        <div className="pc-card p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            <Input
              placeholder="Buscar módulo, funcionalidade, análise técnica..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="flex-1 min-w-[250px]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <FiltroChip label="Core" active={filtroCategoria === 'core'} onClick={() => setFiltroCategoria(filtroCategoria === 'core' ? null : 'core')} />
            <FiltroChip label="Compliance" active={filtroCategoria === 'compliance'} onClick={() => setFiltroCategoria(filtroCategoria === 'compliance' ? null : 'compliance')} />
            <FiltroChip label="Monetização" active={filtroCategoria === 'monetizacao'} onClick={() => setFiltroCategoria(filtroCategoria === 'monetizacao' ? null : 'monetizacao')} />
            <FiltroChip label="Segurança" active={filtroCategoria === 'seguranca'} onClick={() => setFiltroCategoria(filtroCategoria === 'seguranca' ? null : 'seguranca')} />
            <FiltroChip label="Performance" active={filtroCategoria === 'performance'} onClick={() => setFiltroCategoria(filtroCategoria === 'performance' ? null : 'performance')} />
            <FiltroChip label="Integração" active={filtroCategoria === 'integracao'} onClick={() => setFiltroCategoria(filtroCategoria === 'integracao' ? null : 'integracao')} />
            <FiltroChip label="UX" active={filtroCategoria === 'ux'} onClick={() => setFiltroCategoria(filtroCategoria === 'ux' ? null : 'ux')} />
            <div className="w-px h-6 bg-gray-300" />
            <FiltroChip label="Crítica" active={filtroPrioridade === 'critica'} onClick={() => setFiltroPrioridade(filtroPrioridade === 'critica' ? null : 'critica')} color="red" />
            <FiltroChip label="Alta" active={filtroPrioridade === 'alta'} onClick={() => setFiltroPrioridade(filtroPrioridade === 'alta' ? null : 'alta')} color="orange" />
            <FiltroChip label="Média" active={filtroPrioridade === 'media'} onClick={() => setFiltroPrioridade(filtroPrioridade === 'media' ? null : 'media')} color="blue" />
            <FiltroChip label="Baixa" active={filtroPrioridade === 'baixa'} onClick={() => setFiltroPrioridade(filtroPrioridade === 'baixa' ? null : 'baixa')} color="gray" />
          </div>
          {(filtroStatus || filtroPrioridade || filtroCategoria || filtroSemDeadline || busca) && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setFiltroStatus(null);
                setFiltroPrioridade(null);
                setFiltroCategoria(null);
                setFiltroSemDeadline(false);
                setBusca("");
              }} 
              className="mt-3"
            >
              <X className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
          )}
        </div>

        {/* LISTA */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pc-card p-3">
            <p className="text-sm font-bold text-gray-700">
              {itensFiltrados.length} {itensFiltrados.length === 1 ? 'item' : 'itens'}
              {(filtroStatus || filtroPrioridade || filtroCategoria || filtroSemDeadline || busca) && ' (filtrados)'}
            </p>
          </div>

          {itensFiltrados.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={(item) => { setEditando(item.id); setFormData(item); }}
              onDelete={(id) => {
                if (confirm('Deletar permanentemente?')) {
                  deleteMutation.mutate(id);
                }
              }}
              onAuditar={(item) => setItemAuditoria(item)}
              gerarPromptIA={gerarPromptIA}
              previewRefatoramento={previewsRefatoramento[item.id]}
              onGerarPreview={gerarPreviewRefatoramento}
              onAceitarRefatoracao={aceitarRefatoramento}
              onRejeitarRefatoramento={rejeitarRefatoramento}
              analisePendente={analisesPendentes[item.id]}
              onIniciarAnaliseCompleta={iniciarAnaliseCompleta}
              onRenomear={setItemRenomear}
              setAnalisesPendentes={setAnalisesPendentes}
            />
          ))}

          {itensFiltrados.length === 0 && (
            <div className="pc-card p-12 text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600" />
              <p className="font-bold text-lg">Nenhum item encontrado</p>
            </div>
          )}
        </div>





        {/* MODAL PROMPT IA GERADO */}
        {promptGerado && itemPrompt && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto my-4">
              <div className="sticky top-0 z-10 p-6 border-b flex items-center justify-between" style={{
                background: promptGerado.score_eficiencia < 50 ? '#7f1d1d' : 
                           promptGerado.score_eficiencia < 70 ? '#92400e' : '#0B7A9E',
                color: 'white'
              }}>
                <div>
                  <h2 className="text-2xl font-bold mb-1">🧠 Diagnóstico IA - {itemPrompt.modulo}</h2>
                  <p className="text-sm opacity-90">Score: {promptGerado.score_eficiencia}%</p>
                </div>
                <button onClick={() => { setPromptGerado(null); setItemPrompt(null); }} className="p-2 hover:bg-white/20 rounded-lg">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* SCORE */}
                <div className="p-6 rounded-xl border-2 text-center" style={{
                  backgroundColor: promptGerado.score_eficiencia < 50 ? '#fef2f2' : 
                                  promptGerado.score_eficiencia < 70 ? '#fef9e5' : '#e6f7ed',
                  borderColor: promptGerado.score_eficiencia < 50 ? '#dc2626' : 
                              promptGerado.score_eficiencia < 70 ? '#f59e0b' : '#34a853'
                }}>
                  <p className="text-5xl font-bold mb-2" style={{
                    color: promptGerado.score_eficiencia < 50 ? '#7f1d1d' : 
                           promptGerado.score_eficiencia < 70 ? '#92400e' : '#16a34a'
                  }}>
                    {promptGerado.score_eficiencia}%
                  </p>
                  <p className="text-sm font-bold text-gray-600">Eficiência do Módulo</p>
                </div>

                {/* GAPS CRÍTICOS COUNT */}
                {promptGerado.gaps_criticos_count > 0 && (
                  <div className="p-4 rounded-lg border-4 border-red-400 bg-red-50 text-center">
                    <p className="text-5xl font-bold text-red-700">{promptGerado.gaps_criticos_count}</p>
                    <p className="text-sm font-bold text-red-600">Gaps Críticos Identificados</p>
                  </div>
                )}

                {/* DÉBITOS TÉCNICOS CRÍTICOS */}
                {promptGerado.debitos_tecnicos_criticos?.length > 0 && (
                  <div className="p-4 rounded-lg bg-red-50 border-2 border-red-300">
                    <p className="font-bold text-sm mb-2 text-red-700">🚨 Débitos Técnicos Críticos:</p>
                    <ul className="space-y-2">
                      {promptGerado.debitos_tecnicos_criticos.map((d, i) => (
                        <li key={i} className="text-sm text-red-600 p-2 bg-white rounded border border-red-200">• {d}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* DIAGNÓSTICO */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg">📊 Diagnóstico Completo</h3>
                  {promptGerado.diagnostico?.gaps_arquitetura?.length > 0 && (
                    <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                      <p className="font-bold text-sm mb-2 text-red-700">Gaps de Arquitetura:</p>
                      <ul className="space-y-1">
                        {promptGerado.diagnostico.gaps_arquitetura.map((gap, i) => (
                          <li key={i} className="text-sm text-red-600">• {gap}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {promptGerado.diagnostico.componentes_faltantes?.length > 0 && (
                    <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                      <p className="font-bold text-sm mb-2 text-orange-700">Componentes Faltantes:</p>
                      <ul className="space-y-1">
                        {promptGerado.diagnostico.componentes_faltantes.map((comp, i) => (
                          <li key={i} className="text-sm text-orange-600">• {comp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {promptGerado.diagnostico.riscos_tecnicos?.length > 0 && (
                    <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                      <p className="font-bold text-sm mb-2 text-purple-700">Riscos Técnicos:</p>
                      <ul className="space-y-1">
                        {promptGerado.diagnostico.riscos_tecnicos.map((risco, i) => (
                          <li key={i} className="text-sm text-purple-600">• {risco}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* RECURSOS DO NICHO */}
                {promptGerado.recursos_nicho?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-lg mb-3">🎯 Recursos Esperados (Nicho Médico)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {promptGerado.recursos_nicho.map((rec, i) => (
                        <div key={i} className={`p-3 rounded-lg border ${rec.diferencial ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-start justify-between">
                            <p className="text-sm font-medium text-gray-900">{rec.recurso}</p>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              rec.prioridade === 'alta' ? 'bg-red-100 text-red-700' :
                              rec.prioridade === 'media' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {rec.prioridade}
                            </span>
                          </div>
                          {rec.diferencial && (
                            <p className="text-xs text-green-600 mt-1">✨ Diferencial competitivo</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PROMPT COMPLETO */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg">📝 Prompt de Execução</h3>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(promptGerado.prompt_execucao_completo);
                        toast.success('Prompt copiado');
                      }}
                      className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold hover:bg-gray-800"
                    >
                      Copiar Prompt
                    </button>
                  </div>
                  <pre className="p-4 rounded-lg bg-gray-900 text-gray-100 text-xs overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
{promptGerado.prompt_execucao_completo}
                  </pre>
                </div>

                {/* EVIDÊNCIAS E REQUISITOS SUGERIDOS */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <p className="font-bold text-sm mb-2 text-green-700">✅ Evidências Sugeridas:</p>
                    <ul className="space-y-1">
                      {promptGerado.evidencias_sugeridas?.map((ev, i) => (
                        <li key={i} className="text-xs text-green-600 font-mono">• {ev}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="font-bold text-sm mb-2 text-blue-700">🔑 Requisitos Externos:</p>
                    <ul className="space-y-1">
                      {promptGerado.requisitos_externos_sugeridos?.map((req, i) => (
                        <li key={i} className="text-xs text-blue-600 font-mono">• {req}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* AÇÕES */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => { setPromptGerado(null); setItemPrompt(null); }}
                    className="flex-1 py-3 px-4 rounded-lg font-bold border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Rejeitar
                  </button>
                  <button
                    onClick={aceitarInsights}
                    className="flex-1 py-3 px-4 rounded-lg font-bold text-white"
                    style={{ backgroundColor: '#0B7A9E' }}
                  >
                    Aceitar e Aplicar Insights
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL TEMPLATE ESTRUTURADO */}
        {(editando || criando) && modoTemplateEstruturado && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl max-w-6xl w-full max-h-[95vh] overflow-hidden">
              <TemplateModuloEstruturado
                initialData={editando ? checklist.find(i => i.id === editando) : null}
                onSave={async (data) => {
                  if (editando) {
                    await updateMutation.mutateAsync({ id: editando, data });
                  } else {
                    await createMutation.mutateAsync(data);
                  }
                  setModoTemplateEstruturado(false);
                }}
                onCancel={() => {
                  setEditando(null);
                  setCriando(false);
                  setModoTemplateEstruturado(false);
                  setFormData({});
                }}
              />
            </div>
          </div>
        )}

        {/* MODAL TRADICIONAL */}
        {(editando || criando) && !modoTemplateEstruturado && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
              <div className="sticky top-0 bg-purple-600 text-white p-4 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-xl font-bold mb-1">{editando ? 'Editar Roadmap' : 'Novo Item Roadmap'}</h2>
                  <p className="text-xs opacity-90">Modo: Tradicional (texto livre)</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setModoTemplateEstruturado(true)}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm font-bold"
                  >
                    🔄 Modo Estruturado
                  </button>
                  <button onClick={() => { setEditando(null); setCriando(false); setFormData({}); }} className="p-2 hover:bg-purple-700 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-900">Módulo *</label>
                    <Input value={formData.modulo || ''} onChange={(e) => setFormData({ ...formData, modulo: e.target.value })} placeholder="Ex: Prescrição Eletrônica" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-900">Funcionalidade *</label>
                    <Input value={formData.funcionalidade || ''} onChange={(e) => setFormData({ ...formData, funcionalidade: e.target.value })} placeholder="Ex: CRUD com validação CFM" required />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Categoria *</label>
                    <select value={formData.categoria || 'core'} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                      <option value="core">Core</option>
                      <option value="compliance">Compliance</option>
                      <option value="monetizacao">Monetização</option>
                      <option value="integracao">Integração</option>
                      <option value="ux">UX</option>
                      <option value="seguranca">Segurança</option>
                      <option value="performance">Performance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Prioridade *</label>
                    <select value={formData.prioridade || 'media'} onChange={(e) => setFormData({ ...formData, prioridade: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                      <option value="critica">Crítica</option>
                      <option value="alta">Alta</option>
                      <option value="media">Média</option>
                      <option value="baixa">Baixa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Status *</label>
                    <select value={formData.status || 'pendente'} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full border rounded-lg px-3 py-2">
                      <option value="pendente">Pendente</option>
                      <option value="em_progresso">Em Progresso</option>
                      <option value="completo">Completo (exige 100% checklist)</option>
                      <option value="bloqueado">Bloqueado</option>
                      <option value="feature_futura">Feature Futura (skip)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Progresso %</label>
                    <Input type="number" min="0" max="100" value={formData.percentual_completo || 0} onChange={(e) => setFormData({ ...formData, percentual_completo: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-blue-600">🔢 Ordem de Execução</label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={formData.ordem_execucao || ''} 
                      onChange={(e) => setFormData({ ...formData, ordem_execucao: parseInt(e.target.value) || null })} 
                      placeholder="Ex: 1, 2, 3..." 
                      className="border-blue-300 focus:border-blue-500"
                    />
                    <p className="text-xs text-blue-600 mt-1 font-bold">Define ordem nos deadlines automáticos</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-red-600">⏰ Deadline * (OBRIGATÓRIO)</label>
                    <Input type="date" value={formData.deadline || ''} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} required className="border-red-300 focus:border-red-500" />
                    <p className="text-xs text-red-600 mt-1 font-bold">SEM DEADLINE = SEM EXECUÇÃO</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Responsável</label>
                    <Input value={formData.owner || ''} onChange={(e) => setFormData({ ...formData, owner: e.target.value })} placeholder="Nome do responsável" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-900">Análise Técnica & Plano de Execução</label>
                  <textarea
                    value={formData.observacoes || ''}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    className="w-full border rounded-lg px-3 py-3 font-mono text-sm"
                    rows="8"
                    placeholder="PROMPT DE EXECUÇÃO TÉCNICA:

1. ARQUITETURA
   - Entidades necessárias (schemas JSON completos)
   - Functions backend (integrações, validações)
   - Pages/Components (estrutura UI)

2. DEPENDÊNCIAS EXTERNAS
   - APIs necessárias (com endpoints específicos)
   - Secrets/credenciais requeridos
   - Limites de quota/custo

3. TESTES E VALIDAÇÃO
   - Testes E2E críticos
   - Métricas de sucesso (latência, erro, conversão)
   - Critérios de aceite mensuráveis

4. RISCOS TÉCNICOS
   - Complexidade estimada (horas)
   - Bloqueadores conhecidos
   - Plano B se falhar

5. EVIDÊNCIAS DE CONCLUSÃO
   - entities/X.json, pages/Y.js, functions/Z
   - Métricas operacionais atingidas"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Evidências (separadas por vírgula)</label>
                    <Input
                      value={formData.evidencias?.join(', ') || ''}
                      onChange={(e) => setFormData({ ...formData, evidencias: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      placeholder="entities/X.json, pages/Y.js"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Tags</label>
                    <Input
                      value={formData.tags?.join(', ') || ''}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      placeholder="feature_futura, v2, mvp"
                    />
                    <p className="text-xs text-gray-500 mt-1">feature_futura = permite marcar completo sem 100%</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Requisitos Externos</label>
                  <Input
                    value={formData.requisitos_externos?.join(', ') || ''}
                    onChange={(e) => setFormData({ ...formData, requisitos_externos: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    placeholder="API_KEY_X, STRIPE_SECRET"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => { setEditando(null); setCriando(false); setFormData({}); }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={!formData.modulo || !formData.funcionalidade || !formData.deadline} className="bg-purple-600">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL RENOMEAR */}
        {itemRenomear && (
          <ModalRenomearModulo 
            item={itemRenomear}
            onClose={() => setItemRenomear(null)}
            onSuccess={() => {
              queryClient.invalidateQueries(["checklist-projeto"]);
              setItemRenomear(null);
            }}
          />
        )}

        {/* SIDEBAR AGENTE COMPLIANCE */}
        <SidebarAgenteCompliance 
          aberto={sidebarAgenteAberto} 
          onFechar={() => setSidebarAgenteAberto(false)} 
        />
      </div>
    </RouteGuard>
  );
}

function MetricCard({ label, value, color, onClick, active, urgente }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`pc-card p-4 text-left transition-all ${
        onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' : 'cursor-default'
      } ${active ? 'ring-2 ring-purple-600 shadow-lg' : ''} ${urgente && value > 0 ? 'ring-2 ring-red-500 animate-pulse' : ''}`}
    >
      <p className="text-3xl font-bold mb-1" style={{ color }}>{value}</p>
      <p className="text-xs text-gray-600">{label}</p>
      {active && <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-purple-600" />}
    </button>
  );
}

function FiltroChip({ label, active, onClick, color = 'purple' }) {
  const colors = {
    purple: active ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100',
    red: active ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100',
    orange: active ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100',
    blue: active ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    gray: active ? 'bg-gray-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
  };

  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${colors[color]}`}>
      {label}
    </button>
  );
}

function ItemCard({ item, onEdit, onDelete, onAuditar, gerarPromptIA, previewRefatoramento, onGerarPreview, onAceitarRefatoracao, onRejeitarRefatoracao, analisePendente, onIniciarAnaliseCompleta, pollingAtivo, onRenomear, setAnalisesPendentes }) {
  const [expandido, setExpandido] = useState(false);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const deadline = item.deadline ? new Date(item.deadline) : null;
  if (deadline) deadline.setHours(0, 0, 0, 0);

  const atrasado = deadline && deadline < hoje;
  const urgente = deadline && deadline <= new Date(hoje.getTime() + 3 * 24 * 60 * 60 * 1000);

  const statusColors = {
    completo: { bg: '#e6f7ed', text: '#137333', border: '#34a853' },
    em_progresso: { bg: '#e8f1fb', text: '#0e4082', border: '#0B7A9E' },
    bloqueado: { bg: '#fde7e7', text: '#842820', border: '#ea4335' },
    pendente: { bg: '#fef9e5', text: '#ea8600', border: '#f9ab00' },
    feature_futura: { bg: '#f3e8ff', text: '#6b21a8', border: '#9333ea' }
  };

  const prioridadeColors = {
    critica: { bg: '#fde7e7', text: '#c5221f' },
    alta: { bg: '#fef9e5', text: '#f9ab00' },
    media: { bg: '#e8f1fb', text: '#1967d2' },
    baixa: { bg: '#f8f9fa', text: '#5f6368' }
  };

  const statusStyle = statusColors[item.status] || statusColors.pendente;
  const prioridadeStyle = prioridadeColors[item.prioridade] || prioridadeColors.media;

  const foiAuditado = item.observacoes?.includes('AUDITORIA BRUTAL');
  const scoreMatch = item.observacoes?.match(/SCORE HONESTO: (\d+)%/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : null;

  return (
    <div className="pc-card overflow-hidden border-l-4" style={{ borderLeftColor: atrasado ? '#ea4335' : statusStyle.border }}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1 text-gray-900">{item.modulo}</h3>
            <p className="text-sm text-gray-700 font-medium">{item.funcionalidade}</p>
          </div>
          <div className="flex items-center gap-2">
            {item.score_checklist !== undefined && (
              <div className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{
                backgroundColor: item.score_checklist < 50 ? '#fee2e2' : item.score_checklist < 70 ? '#fef3c7' : '#dcfce7',
                color: item.score_checklist < 50 ? '#991b1b' : item.score_checklist < 70 ? '#92400e' : '#166534'
              }}>
                {item.score_checklist}%
              </div>
            )}
            <button 
              onClick={() => onIniciarAnaliseCompleta(item.id)} 
              disabled={item.status_analise_completa === 'processing'}
              className="p-2.5 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 rounded-xl transition-all border-2 border-transparent hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed" 
              title={item.status_analise_completa === 'processing' ? '⏳ Processando... (~2 min)' : '⭐ Análise Completa IA - Backend Job (Scan + Árvore + Refatoramento + Sprint)'}
            >
              {item.status_analise_completa === 'processing' ? (
                <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
              ) : (
                <Star className="w-5 h-5 text-purple-600" fill={item.status_analise_completa === 'completed' ? '#7E57FF' : 'none'} />
              )}
            </button>
            <button onClick={() => onRenomear(item)} className="p-2 hover:bg-blue-50 rounded transition-all" title="Renomear Módulo">
              <Edit2 className="w-5 h-5 text-blue-600" />
            </button>
            <button onClick={() => onDelete(item.id)} className="p-2 hover:bg-red-50 rounded transition-all" title="Deletar">
              <Trash2 className="w-5 h-5 text-red-600" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {item.ordem_execucao && (
            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-700 border-2 border-blue-400">
              🔢 Ordem: {item.ordem_execucao}
            </span>
          )}
          <span className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}>
            {item.status}
          </span>
          <span className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: prioridadeStyle.bg, color: prioridadeStyle.text }}>
            {item.prioridade}
          </span>
          <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-100 text-purple-700">
            {item.categoria}
          </span>

          {/* PREVIEW REFATORAMENTO - SEMPRE VISÍVEL */}
          {!previewRefatoramento && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGerarPreview(item.id);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
            >
              🔬 Analisar Refatoramento
            </button>
          )}

          {previewRefatoramento && (
            <div 
              className="px-3 py-1.5 rounded-lg text-xs font-bold border-2 cursor-pointer hover:opacity-80 transition-all"
              style={{
                backgroundColor: previewRefatoramento.percentual >= 70 ? '#fee2e2' :
                                 previewRefatoramento.percentual >= 40 ? '#fef3c7' :
                                 previewRefatoramento.percentual >= 20 ? '#dcfce7' : '#f3f4f6',
                borderColor: previewRefatoramento.percentual >= 70 ? '#dc2626' :
                             previewRefatoramento.percentual >= 40 ? '#f59e0b' :
                             previewRefatoramento.percentual >= 20 ? '#22c55e' : '#6b7280',
                color: previewRefatoramento.percentual >= 70 ? '#991b1b' :
                       previewRefatoramento.percentual >= 40 ? '#92400e' :
                       previewRefatoramento.percentual >= 20 ? '#166534' : '#374151'
              }}
              onClick={(e) => {
                e.stopPropagation();
                setExpandido(!expandido);
              }}
            >
              {previewRefatoramento.percentual >= 70 ? '🔴' : 
               previewRefatoramento.percentual >= 40 ? '🟡' : 
               previewRefatoramento.percentual >= 20 ? '🟢' : '⚪'} 
              Refatorar: {previewRefatoramento.percentual}%
            </div>
          )}
          {item.percentual_completo > 0 && (
            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-700">
              {item.percentual_completo}%
            </span>
          )}
          {item.tags?.includes('feature_futura') && (
            <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-100 text-purple-700 border-2 border-purple-400">
              🔮 FEATURE FUTURA
            </span>
          )}
          {item.score_checklist !== undefined && (
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              item.score_checklist >= 100 ? 'bg-green-100 text-green-700' :
              item.score_checklist >= 80 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              Checklist: {item.score_checklist}%
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {item.deadline ? (
            <div className={`px-4 py-3 rounded-lg ${atrasado ? 'bg-red-100 border-2 border-red-400' : urgente ? 'bg-orange-100 border-2 border-orange-400' : 'bg-gray-50 border border-gray-300'}`}>
              <p className="text-xs text-gray-600 mb-1">⏰ Deadline</p>
              <p className={`text-sm font-bold ${atrasado ? 'text-red-700' : urgente ? 'text-orange-700' : 'text-gray-900'}`}>
                {deadline.toLocaleDateString('pt-BR')}
                {atrasado && ' (ATRASADO)'}
              </p>
            </div>
          ) : (
            <div className="px-4 py-3 rounded-lg bg-red-100 border-2 border-red-400">
              <p className="text-xs font-bold text-red-700">⚠️ SEM DEADLINE</p>
              <p className="text-xs text-red-600 mt-0.5">Definir urgente</p>
            </div>
          )}
          {item.owner && (
            <div className="px-4 py-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-xs text-gray-600 mb-1">👤 Responsável</p>
              <p className="text-sm font-bold text-gray-900">{item.owner}</p>
            </div>
          )}
        </div>

        {/* COMENTÁRIO DESTAQUE REFATORAMENTO */}
        {previewRefatoramento?.comentario && (
          <div 
            className="mt-3 p-3 rounded-lg border-2 text-sm font-medium"
            style={{
              backgroundColor: previewRefatoramento.percentual >= 70 ? '#fef2f2' :
                               previewRefatoramento.percentual >= 40 ? '#fefce8' : '#f0fdf4',
              borderColor: previewRefatoramento.percentual >= 70 ? '#fca5a5' :
                           previewRefatoramento.percentual >= 40 ? '#fcd34d' : '#86efac',
              color: previewRefatoramento.percentual >= 70 ? '#991b1b' :
                     previewRefatoramento.percentual >= 40 ? '#92400e' : '#166534'
            }}
          >
            💬 <strong>IA:</strong> {previewRefatoramento.comentario}
          </div>
        )}

        {item.observacoes && (
          <div className="bg-gray-50 rounded-lg p-4 mb-3 border border-gray-200">
            <p className="text-xs font-bold text-gray-700 mb-2">📋 Análise Técnica & Plano:</p>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{item.observacoes}</pre>
          </div>
        )}

        {item.score_checklist !== undefined && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${item.score_checklist}%`,
                  backgroundColor: item.score_checklist === 100 ? '#22c55e' : 
                                   item.score_checklist >= 80 ? '#3b82f6' :
                                   item.score_checklist >= 50 ? '#f59e0b' : '#ef4444'
                }}
              />
            </div>
            <span className="text-sm font-bold" style={{
              color: item.score_checklist === 100 ? '#22c55e' : 
                     item.score_checklist >= 80 ? '#3b82f6' :
                     item.score_checklist >= 50 ? '#f59e0b' : '#ef4444'
            }}>
              {item.score_checklist}%
            </span>
          </div>
        )}

        <div className="flex gap-3 mt-3">
          <button
            onClick={() => setExpandido(!expandido)}
            className="flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all"
            style={{
              backgroundColor: expandido ? '#7E57FF' : '#f3f4f6',
              color: expandido ? 'white' : '#374151'
            }}
          >
            {expandido ? '▼ Ocultar Análise Profunda' : '▶ Ver Árvore Técnica + Análise + Diff'}
          </button>
        </div>

        {expandido && (
          <div className="space-y-6 pt-3 border-t">
            {/* EXPORT GLOBAL COMPLETO */}
            <ExportModuloCompleto item={item} />

            {/* DECISÃO REFATORAMENTO - ACEITAR/REJEITAR */}
            {analisePendente && (
              <div className="p-6 rounded-xl border-4" style={{
                backgroundColor: analisePendente.recomendacao_percentual >= 70 ? '#fef2f2' :
                                 analisePendente.recomendacao_percentual >= 40 ? '#fefce8' : '#f0fdf4',
                borderColor: analisePendente.recomendacao_percentual >= 70 ? '#dc2626' :
                             analisePendente.recomendacao_percentual >= 40 ? '#f59e0b' : '#22c55e'
              }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">
                      {analisePendente.recomendacao_percentual >= 70 ? '🔴 REFATORAR IMEDIATO' :
                       analisePendente.recomendacao_percentual >= 40 ? '🟡 REFATORAR PLANEJADO' :
                       analisePendente.recomendacao_percentual >= 20 ? '🟢 MANTER + MONITORAR' : '⚪ MANTER'}
                    </h3>
                    <p className="text-sm mb-3">{analisePendente.comentario_destaque}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Score Atual:</span>
                        <span className="font-bold ml-2">{analisePendente.score_atual}%</span>
                      </div>
                      <span className="text-gray-400">→</span>
                      <div>
                        <span className="text-gray-600">Score Esperado:</span>
                        <span className="font-bold ml-2 text-green-600">{analisePendente.score_esperado}%</span>
                      </div>
                      <div className="ml-auto">
                        <span className="text-gray-600">ROI:</span>
                        <span className="font-bold ml-2 text-2xl">{analisePendente.roi_score}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => onAceitarRefatoracao(item.id, analisePendente)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    ✅ ACEITAR Refatoramento
                  </Button>
                  <Button
                    onClick={() => {
                      const motivo = prompt('Motivo da rejeição (opcional):') || 'Decisão estratégica';
                      onRejeitarRefatoracao(item.id, motivo);
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    ❌ REJEITAR - Manter Atual
                  </Button>
                </div>
              </div>
            )}

            {/* HISTÓRICO DE ANÁLISES (MEMÓRIA) */}
            {item.historico_analises?.length > 0 && (
              <div className="p-4 rounded-lg bg-purple-50 border border-purple-300">
                <h3 className="font-bold text-sm mb-3">📈 Histórico de Análises ({item.historico_analises.length})</h3>
                <div className="space-y-2">
                  {item.historico_analises.slice(-5).reverse().map((h, i) => (
                    <div key={i} className="p-3 bg-white rounded border text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold">{h.tipo.replace(/_/g, ' ').toUpperCase()}</span>
                        <span className="text-gray-500">{new Date(h.timestamp).toLocaleString('pt-BR')}</span>
                      </div>
                      <pre className="text-[10px] text-gray-600 mt-1">{JSON.stringify(h.resultado, null, 2)}</pre>
                    </div>
                  ))}
                  {item.historico_analises.length > 5 && (
                    <p className="text-xs text-gray-500 italic text-center">+ {item.historico_analises.length - 5} análises anteriores</p>
                  )}
                </div>
              </div>
            )}

            {/* ÁRVORE TÉCNICA PROFISSIONAL */}
            <ArvoreTecnicaModulo item={item} />

            {/* ANÁLISE DE REFATORAMENTO - DECISÃO ESTRATÉGICA */}
            <AnaliseRefatoramento 
              item={item}
              onAnaliseCompleta={(analise) => {
                setAnalisesPendentes(prev => ({
                  ...prev,
                  [item.id]: analise
                }));
              }}
            />

            {/* CHECKLIST TÉCNICO REAL */}
            <ChecklistTecnico item={item} />

            {/* SPRINT BREAKDOWN */}
            <SprintBreakdown item={item} />

            {/* RECURSOS BASE44 */}
            <RecursosBase44Checklist item={item} />

            {/* DIFF CODEBASE */}
            <DiffCodebase item={item} />

            {/* DETALHES TRADICIONAIS */}
            {(item.bloqueadores?.length > 0 || item.dependencias?.length > 0 || item.requisitos_externos?.length > 0 || item.evidencias?.length > 0) && (
              <div className="space-y-3">
                {item.bloqueadores?.length > 0 && (
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <p className="text-sm font-bold text-red-700 mb-2">🚫 Bloqueadores Identificados:</p>
                    <ul className="space-y-1.5">
                      {item.bloqueadores.map((b, i) => (
                        <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                          <span className="text-red-500 font-bold">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {item.dependencias?.length > 0 && (
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <p className="text-sm font-bold text-orange-700 mb-2">⚠️ Dependências:</p>
                    <ul className="space-y-1.5">
                      {item.dependencias.map((d, i) => (
                        <li key={i} className="text-sm text-orange-700 flex items-start gap-2">
                          <span className="text-orange-500 font-bold">•</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {item.requisitos_externos?.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm font-bold text-blue-700 mb-2">🔑 Requisitos Externos:</p>
                    <ul className="space-y-1.5">
                      {item.requisitos_externos.map((r, i) => (
                        <li key={i} className="text-sm text-blue-700 font-mono flex items-start gap-2">
                          <span className="text-blue-500 font-bold">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {item.evidencias?.length > 0 && (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm font-bold text-green-700 mb-2">✅ Evidências Declaradas:</p>
                    <ul className="space-y-1.5">
                      {item.evidencias.map((e, i) => (
                        <li key={i} className="text-sm text-green-700 font-mono flex items-start gap-2">
                          <span className="text-green-500 font-bold">•</span>
                          <span>{e}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}