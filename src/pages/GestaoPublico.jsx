import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/ui/PageHeader";
import SlideInPanel from "@/components/ui/SlideInPanel";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/Button";
import { Globe, Edit, Eye, Save, X, Shield, AlertCircle, Zap, Lock, Unlock, RefreshCw, ExternalLink, TrendingUp } from "lucide-react";
import RouteGuard from "@/components/auth/RouteGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";
import { toast } from "sonner";
import { format } from "date-fns";

export default function GestaoPublico() {
  usePerformanceTracker('/GestaoPublico');
  const [showPanel, setShowPanel] = useState(false);
  const [showPageSpeedPanel, setShowPageSpeedPanel] = useState(false);
  const [editando, setEditando] = useState(null);
  const [paginaSelecionada, setPaginaSelecionada] = useState(null);
  const [medindoPageSpeed, setMedindoPageSpeed] = useState(false);
  const [busca, setBusca] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 80);
    return () => clearTimeout(timer);
  }, []);

  const { data: user } = useQuery({
    queryKey: ["auth-user"],
    queryFn: () => base44.auth.me()
  });

  // TODAS as páginas do projeto (scanner automático do Layout)
  const TODAS_PAGINAS = [
    // Públicas nativas
    { name: "Home", path: "/Home", tipo: "publica_nativa" },
    { name: "PlanosPrecos", path: "/PlanosPrecos", tipo: "publica_nativa" },
    { name: "Blog", path: "/Blog", tipo: "publica_nativa" },
    { name: "BlogPost", path: "/BlogPost", tipo: "publica_nativa" },
    { name: "SobreNos", path: "/SobreNos", tipo: "publica_nativa" },
    { name: "Contato", path: "/Contato", tipo: "publica_nativa" },
    { name: "CentralAjuda", path: "/CentralAjuda", tipo: "publica_nativa" },
    { name: "StatusSistema", path: "/StatusSistema", tipo: "publica_nativa" },
    { name: "TermosUso", path: "/TermosUso", tipo: "publica_nativa" },
    { name: "PoliticaPrivacidade", path: "/PoliticaPrivacidade", tipo: "publica_nativa" },
    { name: "ComplianceLGPD", path: "/ComplianceLGPD", tipo: "publica_nativa" },
    
    // Autenticadas CORE
    { name: "DashboardCompleto", path: "/DashboardCompleto", tipo: "autenticada_core" },
    { name: "Agenda", path: "/Agenda", tipo: "autenticada_core" },
    { name: "Pacientes", path: "/Pacientes", tipo: "autenticada_core" },
    { name: "Prontuarios", path: "/Prontuarios", tipo: "autenticada_core" },
    { name: "PrescricoesEletronicas", path: "/PrescricoesEletronicas", tipo: "autenticada_core" },
    { name: "Atendimento", path: "/Atendimento", tipo: "autenticada_core" },
    { name: "Produtos", path: "/Produtos", tipo: "autenticada_core" },
    { name: "Estoque", path: "/Estoque", tipo: "autenticada_admin" },
    { name: "Financeiro", path: "/Financeiro", tipo: "autenticada_admin" },
    { name: "Administracao", path: "/Administracao", tipo: "autenticada_admin" },
    
    // Módulos avançados
    { name: "Tratamentos", path: "/Tratamentos", tipo: "autenticada_modulo" },
    { name: "AnaliseDocumentosIA", path: "/AnaliseDocumentosIA", tipo: "autenticada_modulo" },
    { name: "ColaboracaoMedica", path: "/ColaboracaoMedica", tipo: "autenticada_modulo" },
    { name: "JornadaPaciente", path: "/JornadaPaciente", tipo: "autenticada_modulo" },
    { name: "Telemedicina", path: "/Telemedicina", tipo: "autenticada_modulo" },
    { name: "Repositorio", path: "/Repositorio", tipo: "autenticada_admin" },
    
    // SuperAdmin
    { name: "SuperAdmin", path: "/SuperAdmin", tipo: "autenticada_superadmin" },
    { name: "GestaoClinicas", path: "/GestaoClinicas", tipo: "autenticada_superadmin" },
    { name: "FinanceiroPlataforma", path: "/FinanceiroPlataforma", tipo: "autenticada_superadmin" },
    { name: "GestaoPlanos", path: "/GestaoPlanos", tipo: "autenticada_superadmin" },
    { name: "HubCompliance", path: "/HubCompliance", tipo: "autenticada_superadmin" },
    { name: "HubEmail", path: "/HubEmail", tipo: "autenticada_superadmin" },
    { name: "HubMonitoramento", path: "/HubMonitoramento", tipo: "autenticada_superadmin" },
    { name: "RoadmapSidebarApps", path: "/RoadmapSidebarApps", tipo: "autenticada_superadmin" },
    { name: "PlanejamentoEstrategico", path: "/PlanejamentoEstrategico", tipo: "autenticada_superadmin" }
  ];

  const { data: configs = [], isLoading } = useOptimizedQuery({
    queryKey: ['configs-publicidade'],
    queryFn: () => base44.entities.ConfiguracaoPublicidade.list("-updated_date"),
    enabled: user?.role === 'admin'
  });

  const togglePublicoMutation = useMutation({
    mutationFn: async ({ pageName, ativo }) => {
      const configExistente = configs.find(c => c.page_name === pageName);
      const agora = new Date().toISOString();
      const autoDesativar = new Date();
      autoDesativar.setHours(autoDesativar.getHours() + 2); // 2h limite

      if (configExistente) {
        return await base44.entities.ConfiguracaoPublicidade.update(configExistente.id, {
          permite_acesso_publico: ativo,
          ativado_em: ativo ? agora : null,
          ativado_por: ativo ? user.email : null,
          desativar_automaticamente_em: ativo ? autoDesativar.toISOString() : null
        });
      } else {
        const page = TODAS_PAGINAS.find(p => p.name === pageName);
        return await base44.entities.ConfiguracaoPublicidade.create({
          page_name: pageName,
          page_path: page?.path || `/${pageName}`,
          permite_acesso_publico: ativo,
          motivo_publicacao: "pagespeed_insights",
          ativado_em: ativo ? agora : null,
          ativado_por: ativo ? user.email : null,
          desativar_automaticamente_em: ativo ? autoDesativar.toISOString() : null
        });
      }
    },
    onSuccess: (data, { pageName, ativo }) => {
      queryClient.invalidateQueries(['configs-publicidade']);
      toast.success(ativo 
        ? `🔓 ${pageName} PÚBLICA por 2h (PageSpeed)`
        : `🔒 ${pageName} protegida novamente`
      );
    }
  });

  const medirPageSpeedMutation = useMutation({
    mutationFn: async (pageName) => {
      setMedindoPageSpeed(true);
      const page = TODAS_PAGINAS.find(p => p.name === pageName);
      const baseUrl = window.location.origin;
      const fullUrl = `${baseUrl}${page.path}`;

      const { data } = await base44.functions.invoke('getPageSpeedInsights', {
        url: fullUrl
      });

      // Atualizar config com scores
      const configExistente = configs.find(c => c.page_name === pageName);
      if (configExistente) {
        await base44.entities.ConfiguracaoPublicidade.update(configExistente.id, {
          url_pagespeed: data.lighthouseResult?.finalUrl,
          score_performance: Math.round((data.lighthouseResult?.categories?.performance?.score || 0) * 100),
          score_accessibility: Math.round((data.lighthouseResult?.categories?.accessibility?.score || 0) * 100),
          score_seo: Math.round((data.lighthouseResult?.categories?.seo?.score || 0) * 100),
          ultima_medicao: new Date().toISOString()
        });
      }

      setMedindoPageSpeed(false);
      return data;
    },
    onSuccess: (data, pageName) => {
      queryClient.invalidateQueries(['configs-publicidade']);
      const perfScore = Math.round((data.lighthouseResult?.categories?.performance?.score || 0) * 100);
      
      if (perfScore < 50) {
        toast.error(`💀 ${pageName}: ${perfScore}% (CATASTRÓFICO)`);
      } else if (perfScore < 70) {
        toast.warning(`🔴 ${pageName}: ${perfScore}% (RUIM)`);
      } else if (perfScore < 90) {
        toast.success(`🟡 ${pageName}: ${perfScore}% (BOM)`);
      } else {
        toast.success(`✅ ${pageName}: ${perfScore}% (EXCELENTE)`);
      }
    },
    onError: () => {
      setMedindoPageSpeed(false);
      toast.error('Erro ao medir PageSpeed');
    }
  });

  const paginasComConfig = TODAS_PAGINAS.map(page => {
    const config = configs.find(c => c.page_name === page.name);
    return { ...page, config };
  });

  const paginasFiltradas = paginasComConfig.filter(p => 
    !busca || 
    p.name.toLowerCase().includes(busca.toLowerCase()) ||
    p.tipo.includes(busca.toLowerCase())
  );

  const togglePublico = (pageName, ativo) => {
    const page = TODAS_PAGINAS.find(p => p.name === pageName);
    
    if (ativo && page.tipo.includes('core')) {
      const confirma = window.confirm(
        `⚠️ ATENÇÃO SEGURANÇA:\n\n"${pageName}" contém dados sensíveis de pacientes/clínica.\n\nLiberar acesso público pode violar LGPD.\n\nApenas libere se a página não exibir dados reais (ex: usar clinica_id fake).\n\nConfirmar liberação temporária (2h)?`
      );
      if (!confirma) return;
    }
    
    togglePublicoMutation.mutate({ pageName, ativo });
  };

  if (pageLoading || isLoading) {
    return (
      <RouteGuard requireAuth={true} requireClinica={false}>
        <div className="space-y-6 overflow-x-hidden animate-pulse">
          <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#e8eaed' }}>
            <div className="h-8 bg-gray-200 rounded w-48 mb-3" />
            <div className="h-5 bg-gray-200 rounded w-64" />
          </div>
        </div>
      </RouteGuard>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <RouteGuard requireAuth>
        <div className="pc-card p-8 text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-600" />
          <p className="text-red-600 font-bold">Acesso exclusivo SuperAdmin</p>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard requireAuth={true} requireClinica={false}>
      <div className="space-y-5 md:space-y-6 overflow-x-hidden min-w-0">
      <PageHeader
        title="Gestão Páginas Públicas + PageSpeed"
        description="Toggle autenticação temporário + auditoria Google PageSpeed Insights"
        action={
          <div className="flex gap-2">
            <Input
              placeholder="Buscar página..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-48"
            />
          </div>
        }
      />

      {/* ALERTA SEGURANÇA */}
      <div className="pc-card p-5" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: '#dc2626' }} />
          <div className="flex-1">
            <p className="font-bold mb-2" style={{ color: '#991b1b' }}>⚠️ SEGURANÇA LGPD</p>
            <p className="text-sm" style={{ color: '#b91c1c' }}>
              Páginas core (Dashboard, Pacientes, Prontuários) contêm dados sensíveis. 
              Ao liberar acesso público, você EXPÕE dados se não houver filtro clinica_id fake.
              Use APENAS para PageSpeed em staging/dev. NUNCA em produção com dados reais.
            </p>
            <p className="text-xs mt-2" style={{ color: '#dc2626' }}>
              Auto-desativação: 2h após ativar. Reative manualmente se necessário.
            </p>
          </div>
        </div>
      </div>

      {/* TABELA PÁGINAS */}
      <div className="pc-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b" style={{ borderColor: '#e8eaed' }}>
              <tr>
                <th className="text-left py-3 px-4 font-bold text-sm" style={{ color: '#5f6368' }}>Página</th>
                <th className="text-center py-3 px-4 font-bold text-sm" style={{ color: '#5f6368' }}>Tipo</th>
                <th className="text-center py-3 px-4 font-bold text-sm" style={{ color: '#5f6368' }}>Status</th>
                <th className="text-center py-3 px-4 font-bold text-sm" style={{ color: '#5f6368' }}>PageSpeed</th>
                <th className="text-center py-3 px-4 font-bold text-sm" style={{ color: '#5f6368' }}>Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#e8eaed' }}>
              {paginasFiltradas.map(page => {
                const isPublica = page.config?.permite_acesso_publico || page.tipo === 'publica_nativa';
                const temScore = page.config?.score_performance > 0;
                
                return (
                  <tr key={page.name} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium" style={{ color: '#202124' }}>{page.name}</p>
                      <p className="text-xs" style={{ color: '#80868b' }}>{page.path}</p>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="px-2 py-1 rounded text-xs font-bold" style={{
                        backgroundColor: 
                          page.tipo === 'publica_nativa' ? '#e6f7ed' :
                          page.tipo.includes('superadmin') ? '#fef2f2' :
                          page.tipo.includes('admin') ? '#fef9e5' : '#e8f1fb',
                        color:
                          page.tipo === 'publica_nativa' ? '#137333' :
                          page.tipo.includes('superadmin') ? '#991b1b' :
                          page.tipo.includes('admin') ? '#92400e' : '#0e4082'
                      }}>
                        {page.tipo.replace('autenticada_', '').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      {page.tipo === 'publica_nativa' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                          Pública
                        </span>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          {isPublica ? (
                            <Unlock className="w-4 h-4 text-orange-600" />
                          ) : (
                            <Lock className="w-4 h-4 text-gray-400" />
                          )}
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isPublica}
                              onChange={(e) => togglePublico(page.name, e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                          </label>
                        </div>
                      )}
                      {isPublica && page.config?.desativar_automaticamente_em && (
                        <p className="text-xs mt-1" style={{ color: '#f59e0b' }}>
                          Auto-off: {format(new Date(page.config.desativar_automaticamente_em), 'HH:mm')}
                        </p>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {temScore ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-center gap-2">
                            <TrendingUp className="w-4 h-4" style={{ 
                              color: page.config.score_performance >= 90 ? '#34a853' :
                                     page.config.score_performance >= 70 ? '#fbbc04' : '#ea4335'
                            }} />
                            <span className="font-bold" style={{
                              color: page.config.score_performance >= 90 ? '#34a853' :
                                     page.config.score_performance >= 70 ? '#fbbc04' : '#ea4335'
                            }}>
                              {page.config.score_performance}%
                            </span>
                          </div>
                          <p className="text-xs" style={{ color: '#80868b' }}>
                            A11y: {page.config.score_accessibility}% • SEO: {page.config.score_seo}%
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: '#bdc1c6' }}>Não medido</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => medirPageSpeedMutation.mutate(page.name)}
                          disabled={medindoPageSpeed || (!isPublica && page.tipo !== 'publica_nativa')}
                          className="px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 disabled:opacity-40"
                          style={{ backgroundColor: '#7E57FF', color: 'white' }}
                          title={!isPublica && page.tipo !== 'publica_nativa' ? 'Ative o toggle primeiro' : 'Medir performance'}
                        >
                          <Zap className="w-3 h-3" />
                          Medir
                        </button>
                        {page.config?.url_pagespeed && (
                          <a
                            href={page.config.url_pagespeed}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1"
                            style={{ backgroundColor: '#e6f7ed', color: '#137333' }}
                          >
                            <ExternalLink className="w-3 h-3" />
                            Ver
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RESUMO GERAL */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="pc-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="w-8 h-8" style={{ color: '#34a853' }} />
            <div>
              <p className="text-sm" style={{ color: '#80868b' }}>Públicas Nativas</p>
              <p className="text-2xl font-bold" style={{ color: '#202124' }}>
                {TODAS_PAGINAS.filter(p => p.tipo === 'publica_nativa').length}
              </p>
            </div>
          </div>
        </div>
        <div className="pc-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Unlock className="w-8 h-8" style={{ color: '#f59e0b' }} />
            <div>
              <p className="text-sm" style={{ color: '#80868b' }}>Liberadas Temp.</p>
              <p className="text-2xl font-bold" style={{ color: '#202124' }}>
                {configs.filter(c => c.permite_acesso_publico).length}
              </p>
            </div>
          </div>
        </div>
        <div className="pc-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8" style={{ color: '#7E57FF' }} />
            <div>
              <p className="text-sm" style={{ color: '#80868b' }}>Medições</p>
              <p className="text-2xl font-bold" style={{ color: '#202124' }}>
                {configs.filter(c => c.score_performance > 0).length}
              </p>
            </div>
          </div>
        </div>
        <div className="pc-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8" style={{ color: '#34a853' }} />
            <div>
              <p className="text-sm" style={{ color: '#80868b' }}>Score Médio</p>
              <p className="text-2xl font-bold" style={{ color: '#34a853' }}>
                {configs.length > 0 
                  ? Math.round(configs.reduce((acc, c) => acc + (c.score_performance || 0), 0) / configs.filter(c => c.score_performance > 0).length || 0)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PÁGINAS COM ALERTA LGPD */}
      {configs.filter(c => c.permite_acesso_publico && c.alertas_seguranca?.length > 0).length > 0 && (
        <div className="pc-card p-5" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#dc2626' }} />
            <div>
              <p className="font-bold mb-2" style={{ color: '#991b1b' }}>Alertas Ativos</p>
              {configs.filter(c => c.permite_acesso_publico && c.alertas_seguranca?.length > 0).map(c => (
                <div key={c.id} className="mb-2">
                  <p className="text-sm font-medium" style={{ color: '#b91c1c' }}>{c.page_name}:</p>
                  <ul className="text-xs ml-4" style={{ color: '#dc2626' }}>
                    {c.alertas_seguranca.map((a, i) => (
                      <li key={i}>• {a}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 overflow-hidden">
      </div>
      </div>
    </RouteGuard>
  );
}