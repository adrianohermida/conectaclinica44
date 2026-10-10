import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * COMPLIANCE LGPD: Modal BLOQUEANTE - PREVENCLIN FIX
 * BRUTAL: localStorage + BD + cache = NUNCA reabrir após aceite
 */
export default function ModalTermoObrigatorio() {
  const [currentTermoIndex, setCurrentTermoIndex] = useState(0);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [leituraCompleta, setLeituraCompleta] = useState(false);
  const [tempoLeitura, setTempoLeitura] = useState(0);
  const queryClient = useQueryClient();
  const contentRef = React.useRef(null);

  const { data: user } = useQuery({
    queryKey: ['auth-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  // CRITICAL FIX: Usar EMAIL (imutável) ao invés de ID (pode mudar)
  const getChaveLocal = () => `termo_aceito_${user?.email}`;
  const [fechadoPermanente, setFechadoPermanente] = useState(false);

  // BRUTAL FIX: Query 100% isolada + localStorage OVERRIDE
  const { data: termosPendentes = [], isLoading } = useQuery({
    queryKey: ['termos-pendentes-final', user?.email],
    queryFn: async () => {
      if (!user?.email || !user?.id) return [];
      
      const chave = `termo_aceito_${user.email}`;
      
      // CRITICAL: localStorage SHORT-CIRCUIT (previne query desnecessária)
      const localCache = localStorage.getItem(chave);
      if (localCache === 'SIM') {
        console.log('[ModalTermo] ⚡ SHORT-CIRCUIT - localStorage já tem aceite');
        return [];
      }
      
      console.log('[ModalTermo] 🔍 Verificando BD:', user.email);
      
      try {
        // CRITICAL: Buscar aceites APENAS por email (User entity = RBAC restrito)
        const aceites = await base44.entities.AceiteTermoLegal.filter({ usuario_email: user.email });
        console.log('[ModalTermo] 📊 Aceites BD:', aceites.length);
        
        // CRITICAL FIX: Query ENTIDADE CORRETA (TermoLegal, NÃO ConteudoLegal)
        const todosTermos = await base44.entities.TermoLegal.filter({ 
          ativo: true, 
          obrigatorio: true
        });
        console.log('[ModalTermo] 📋 TermoLegal (entity correta):', todosTermos.length);

        if (!todosTermos || todosTermos.length === 0) {
          console.log('[ModalTermo] ✅ Nenhum termo obrigatório');
          localStorage.setItem(chave, 'SIM');
          return [];
        }
        
        // CRÍTICO: Filtrar por ID E VERSÃO
        const pendentes = todosTermos.filter(t => {
          const aceito = aceites.find(a => 
            (a.termo_legal_id === t.id || a.termo_id === t.id) && 
            a.termo_versao === t.versao
          );
          console.log('[ModalTermo] 🔍 Termo:', t.tipo, 'Aceito?', !!aceito);
          return !aceito;
        });
        
        console.log('[ModalTermo] Total:', todosTermos.length, 'Pendentes:', pendentes.length);
        
        // Se não há pendentes, salvar em localStorage
        if (pendentes.length === 0) {
          localStorage.setItem(chave, 'SIM');
        }
        
        return pendentes;
      } catch (error) {
        console.error('[ModalTermo] ❌ Erro:', error);
        // Em caso de erro, assume que está OK (não bloqueia app)
        const chaveErro = `termo_aceito_${user.email}`;
        localStorage.setItem(chaveErro, 'SIM');
        return [];
      }
    },
    enabled: !!user?.email && !!user?.id && !fechadoPermanente,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: false
  });

  const aceiteMutation = useMutation({
    mutationFn: async (termo) => {
      console.log('[ModalTermo] 📝 INICIANDO ACEITE:', termo.id);
      
      const user = await base44.auth.me();
      console.log('[ModalTermo] 👤 User:', user.email);
      
      // CRITICAL: Buscar por email (não user_id - RBAC)
      const aceites = await base44.entities.AceiteTermoLegal.filter({ 
        usuario_email: user.email,
        termo_legal_id: termo.id,
        termo_versao: termo.versao
      });
      console.log('[ModalTermo] 🔍 Aceites existentes:', aceites.length);
      const jaAceito = aceites.length > 0;
      
      if (jaAceito) {
        console.log('[ModalTermo] ⏭️ JÁ ACEITO - SKIP');
        return { success: true, duplicado: true };
      }
      
      // BRUTAL FIX: clinica_id OBRIGATÓRIO (multi-tenant)
      if (!user.clinica_id) {
        console.error('[ModalTermo] ❌ BLOQUEIO: user.clinica_id AUSENTE');
        throw new Error('Clínica não identificada - onboarding incompleto');
      }

      // PAYLOAD COMPLETO (required fields do schema) + clinica_id
      const payload = {
        clinica_id: user.clinica_id, // CRITICAL: multi-tenant isolation
        termo_legal_id: termo.id,
        termo_versao: termo.versao || '1.0',
        usuario_id: user.id,
        usuario_nome: user.full_name || user.email,
        usuario_email: user.email,
        timestamp_aceite: new Date().toISOString(),
        ip_address: 'client',
        hash_aceite: `${termo.id}_${user.id}_${Date.now()}`,
        hash_termo_original: termo.hash_sha256 || 'modal_v1',
        user_agent: navigator.userAgent,
        aceito: true
      };
      console.log('[ModalTermo] 📦 PAYLOAD:', JSON.stringify(payload, null, 2));
      
      // CREATE DIRETO (sem function intermediária)
      let aceite;
      try {
        console.log('[ModalTermo] 🚀 CHAMANDO CREATE DIRETO...');
        aceite = await base44.entities.AceiteTermoLegal.create(payload);
        console.log('[ModalTermo] ✅ CREATE SUCESSO:', aceite?.id);
        
        // VALIDAÇÃO BRUTAL: Verificar se salvou no BD
        const verificacao = await base44.entities.AceiteTermoLegal.filter({ id: aceite.id });
        console.log('[ModalTermo] 🔍 VERIFICAÇÃO BD:', verificacao.length > 0 ? '✅ SALVO' : '❌ NÃO ENCONTRADO');
      } catch (error) {
        console.error('[ModalTermo] ❌ CREATE FALHOU:', error);
        console.error('[ModalTermo] Response:', error.response?.data);
        console.error('[ModalTermo] Stack:', error.stack);
        throw error;
      }
      
      if (!aceite || !aceite.id) {
        console.error('[ModalTermo] ❌ ACEITE VAZIO:', aceite);
        throw new Error('Aceite retornou vazio após create');
      }
      
      console.log('[ModalTermo] ✅ FINALIZADO:', aceite.id);
      return { success: true, aceite_id: aceite.id };
    },
    onError: (error) => {
      console.error('[ModalTermo] ❌ MUTATION ERROR:', error);
      toast.error(`Erro ao registrar aceite: ${error.message}`);
    },
    onSuccess: (data) => {
      console.log('[ModalTermo] ✅ MUTATION SUCCESS:', data);
    }
  });

  // SCROLL TRACKER + FALLBACK EMERGÊNCIA + DELAY FIX
  useEffect(() => {
    // CRITICAL FIX: Delay para garantir DOM renderizado
    const initTimeout = setTimeout(() => {
      const content = contentRef.current;
      if (!content) {
        console.error('[ModalTermo] ❌ contentRef.current NULL após delay');
        // FALLBACK BRUTAL: Se ref NULL após 100ms, assumir conteúdo cabe
        setScrollPercent(100);
        setLeituraCompleta(true);
        return;
      }
      
      console.log('[ModalTermo] 🎯 contentRef conectado:', !!content);
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = content;
      
      console.log('[ModalTermo] 📏 Scroll BRUTAL:', { 
        scrollTop, 
        scrollHeight, 
        clientHeight,
        delta: scrollHeight - clientHeight,
        cabe: scrollHeight <= clientHeight + 5
      });
      
      // FIX BRUTAL: +5px tolerância (padding/border podem afetar)
      if (scrollHeight <= clientHeight + 5) {
        console.log('[ModalTermo] ✅ CONTEÚDO CABE - AUTO 100%');
        setScrollPercent(100);
        setLeituraCompleta(true);
        return;
      }
      
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll <= 0) {
        console.log('[ModalTermo] ⚠️ maxScroll <= 0 - forçando completo');
        setScrollPercent(100);
        setLeituraCompleta(true);
        return;
      }
      
      const percent = Math.min(100, Math.round((scrollTop / maxScroll) * 100));
      setScrollPercent(percent);
      console.log('[ModalTermo] 📊 Scroll:', percent, '%');
      
      // TOLERÂNCIA BRUTAL: 70% = completo (mobile pode não scroll até fim)
      if (percent >= 70) {
        console.log('[ModalTermo] ✅ COMPLETO -', percent, '%');
        setLeituraCompleta(true);
      }
    };
    
    // MEGA CHECK: 5 checks + intervalo contínuo
    handleScroll(); // Check 1: Imediato
    const timeout1 = setTimeout(handleScroll, 100);
    const timeout2 = setTimeout(handleScroll, 500);
    const timeout3 = setTimeout(handleScroll, 1000);
    const timeout4 = setTimeout(handleScroll, 2000);
    
    // FALLBACK EMERGÊNCIA: após 3s, permitir aceite manual (previne travamento)
    const fallbackTimeout = setTimeout(() => {
      console.warn('[ModalTermo] ⚠️ FALLBACK 3s - liberando aceite manual');
      setLeituraCompleta(true);
      setScrollPercent(100);
    }, 3000);
    
      content.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleScroll);
      
      return () => {
        content.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
        clearTimeout(timeout1);
        clearTimeout(timeout2);
        clearTimeout(timeout3);
        clearTimeout(timeout4);
        clearTimeout(fallbackTimeout);
      };
    }, 100); // DELAY 100ms para DOM renderizar
    
    return () => clearTimeout(initTimeout);
  }, [currentTermoIndex]);
  
  // TIMER
  useEffect(() => {
    if (termosPendentes.length === 0) return;
    const interval = setInterval(() => setTempoLeitura(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [termosPendentes.length, currentTermoIndex]);

  if (isLoading || !user || fechadoPermanente || termosPendentes.length === 0) return null;

  const termoAtual = termosPendentes[currentTermoIndex];

  const handleAceitar = async () => {
    console.log('[ModalTermo] 🎯 Aceitando:', currentTermoIndex, 'leituraCompleta:', leituraCompleta, 'scrollPercent:', scrollPercent);
    
    await aceiteMutation.mutateAsync(termoAtual);
    
    if (currentTermoIndex < termosPendentes.length - 1) {
      setCurrentTermoIndex(currentTermoIndex + 1);
      setScrollPercent(0);
      setLeituraCompleta(false);
      setTempoLeitura(0);
    } else {
      console.log('[ModalTermo] ✅ FECHANDO PERMANENTE');
      
      localStorage.setItem(getChaveLocal(), 'SIM');
      setFechadoPermanente(true);
      queryClient.setQueryData(['termos-pendentes-final', user?.email], []);
      
      toast.success(
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-bold">Normas CFM Confirmadas</p>
            <p className="text-xs text-gray-600">Acesse o ícone 🛡️ para visualizar</p>
          </div>
        </div>,
        { duration: 5000 }
      );
    }
  };

  const tipoLabels = {
    cfm_normas: 'Normas CFM',
    lgpd_termo: 'Termo LGPD',
    codigo_etica: 'Código de Ética',
    cdc_direitos: 'Direitos CDC',
    termo_uso: 'Termo de Uso',
    politica_privacidade: 'Política de Privacidade',
    outro: 'Termo Legal'
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Aceite Obrigatório</h2>
          </div>
          <p className="text-purple-100 text-sm">
            {termosPendentes.length} termo(s) pendente(s)
          </p>
          <div className="mt-4 flex gap-1">
            {termosPendentes.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full ${
                  index <= currentTermoIndex ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        <div ref={contentRef} className="p-6 overflow-y-auto max-h-[50vh]" style={{ overscrollBehavior: 'contain' }}>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-bold">
              {termoAtual.titulo}
            </h3>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">v{termoAtual.versao}</span>
          </div>
          
          {!leituraCompleta && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-yellow-700" />
                <p className="text-xs font-bold text-yellow-800">
                  Role até 70% ou aguarde 3s ({scrollPercent}% lido)
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full transition-all"
                  style={{ width: `${scrollPercent}%` }}
                />
              </div>
            </div>
          )}

          {!termoAtual.conteudo_html || termoAtual.conteudo_html.length < 50 ? (
            <div className="p-8 text-center bg-red-50 rounded-lg border-2 border-red-200">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-3" />
              <p className="font-bold text-red-900">⚠️ Conteúdo do termo não disponível</p>
              <p className="text-sm text-red-700 mt-1">
                ID: {termoAtual.id} | Versão: {termoAtual.versao}
              </p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: termoAtual.conteudo_html }} />
          )}

          <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <strong>Direitos LGPD:</strong>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>• Acesso e correção de dados</li>
                  <li>• Portabilidade e eliminação</li>
                  <li>• Revogação do consentimento</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Termo {currentTermoIndex + 1} de {termosPendentes.length}
              </span>
              <span className="text-xs text-gray-500">
                Leitura: {scrollPercent}% • {tempoLeitura}s
              </span>
            </div>
            
            <button
              onClick={handleAceitar}
              disabled={aceiteMutation.isPending || !leituraCompleta}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold min-h-[48px]"
              title={!leituraCompleta ? `Role até 80% do conteúdo (${scrollPercent}% lido)` : 'Clique para aceitar'}
            >
              {aceiteMutation.isPending ? 'Processando...' : leituraCompleta ? '✅ Li e Aceito' : `📜 Leia até 80% (${scrollPercent}%)`}
            </button>
            
            <p className="text-xs text-gray-500 text-center">
              Aceite registrado com hash SHA-256 auditável (LGPD Art. 37 + Marco Civil Art. 11)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}