import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { 
  Settings, 
  CreditCard, 
  LogOut, 
  Shield, 
  User,
  Building2,
  ChevronRight,
  X,
  Plus,
  Check,
  ChevronLeft,
  Zap,
  BarChart3,
  Bell,
  HelpCircle,
  Lock,
  Globe,
  Sparkles,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function UserMenu({ user }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [viewAtual, setViewAtual] = useState("main"); // main, workspace, billing, account, ia
  const [clinicas, setClinicas] = useState([]);
  const [clinicaAtual, setClinicaAtual] = useState(null);
  const [planoAtual, setPlanoAtual] = useState(null);
  const [creditosIA, setCreditosIA] = useState(null);
  const [uso, setUso] = useState(null);

  const isSuperAdmin = user?.role === 'admin' && !user?.clinica_id;

  useEffect(() => {
    const loadData = async () => {
      try {
        if (user?.clinica_id) {
          const [clinicaRes, assinaturaRes, creditosRes, consumoRes] = await Promise.all([
            base44.entities.Clinica.filter({ id: user.clinica_id }),
            base44.entities.AssinaturaClinica.filter({ clinica_id: user.clinica_id }),
            base44.entities.CreditoIA.filter({ clinica_id: user.clinica_id }),
            base44.entities.ConsumoRecurso.filter({ clinica_id: user.clinica_id })
          ]);
          
          if (clinicaRes.length > 0) setClinicaAtual(clinicaRes[0]);
          if (assinaturaRes.length > 0) {
            const planoSlug = assinaturaRes[0].plano_slug;
            const todosPlanos = await base44.entities.PlanoModulo.list();
            const plano = todosPlanos.find(p => p.nome.toLowerCase() === planoSlug);
            setPlanoAtual(plano);
          }
          
          const creditosTotal = creditosRes.reduce((sum, c) => sum + (c.creditos_disponiveis || 0), 0);
          setCreditosIA({ disponiveis: creditosTotal, total: creditosTotal + 100 });
          
          const hoje = new Date();
          const mesAtual = consumoRes.filter(c => {
            const dataConsumo = new Date(c.created_date);
            return dataConsumo.getMonth() === hoje.getMonth() && dataConsumo.getFullYear() === hoje.getFullYear();
          });
          setUso({
            agendamentos: mesAtual.filter(c => c.tipo === 'agendamento').length,
            pacientes: mesAtual.filter(c => c.tipo === 'paciente').length,
            ia_chamadas: mesAtual.filter(c => c.tipo === 'ia').length
          });
        }
        
        if (isSuperAdmin) {
          const todasClinicas = await base44.asServiceRole.entities.Clinica.list("-created_date", 100);
          setClinicas(todasClinicas || []);
        }
      } catch (e) {
        console.error("Erro ao carregar dados:", e);
      }
    };
    
    if (user) loadData();
  }, [user, isSuperAdmin]);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await base44.auth.logout();
      window.location.href = createPageUrl("Home");
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      window.location.href = createPageUrl("Home");
    }
  };

  const getInitials = () => {
    if (!user?.full_name) return "U";
    return user.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const voltar = () => {
    setViewAtual("main");
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setMenuAberto(!menuAberto)}
          className="w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center overflow-hidden transition-all hover:ring-2 ring-[#7E57FF]"
          style={{ backgroundColor: user?.avatar_url ? 'transparent' : '#7E57FF' }}
          aria-label="Menu do usuário"
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-sm">{getInitials()}</span>
          )}
        </button>

        {/* Desktop Dropdown Menu */}
        {menuAberto && (
          <>
            {/* Mobile Modal */}
            <div className="md:hidden">
              <div 
                className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" 
                onClick={() => {
                  setMenuAberto(false);
                  setViewAtual("main");
                }}
              />
              <div className="fixed inset-x-0 bottom-0 w-full bg-white z-[90] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              
              {/* Mobile Header */}
              <div className="md:hidden flex-shrink-0">
                <div className="pt-3 pb-2 flex justify-center">
                  <div className="w-12 h-1 rounded-full" style={{ backgroundColor: '#dadce0' }} />
                </div>
                <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #e8eaed' }}>
                  {viewAtual !== "main" && (
                    <button
                      onClick={voltar}
                      className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all mr-2"
                      aria-label="Voltar"
                    >
                      <ChevronLeft className="w-5 h-5" style={{ color: '#5f6368' }} />
                    </button>
                  )}
                  <h2 className="text-xl font-bold flex-1" style={{ color: '#202124' }}>
                    {viewAtual === "main" && "Menu"}
                    {viewAtual === "workspace" && "Minha Clínica"}
                    {viewAtual === "billing" && "Plano & Pagamentos"}
                    {viewAtual === "account" && "Minha Conta"}
                    {viewAtual === "ia" && "IA & Créditos"}
                  </h2>
                  <button
                    onClick={() => {
                      setMenuAberto(false);
                      setViewAtual("main");
                    }}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all"
                    aria-label="Fechar"
                  >
                    <X className="w-5 h-5" style={{ color: '#5f6368' }} />
                  </button>
                </div>
              </div>



              {/* Content - Mobile */}
              <div className="flex-1 overflow-y-auto pc-scrollbar">
                
                {/* MAIN VIEW */}
                {viewAtual === "main" && (
                  <div className="p-5">
                    {/* User Info Card */}
                    <div className="mb-5 p-5 rounded-2xl" style={{ backgroundColor: '#f5f3ff' }}>
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: user?.avatar_url ? 'transparent' : '#7E57FF' }}
                        >
                          {user?.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            <span className="text-white font-bold text-xl">{getInitials()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-lg mb-1 truncate" style={{ color: '#202124' }}>{user?.full_name}</p>
                          <p className="text-sm mb-2 truncate" style={{ color: '#5f6368' }}>{user?.email}</p>
                          {user?.role === 'admin' && (
                            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full" style={{ backgroundColor: '#7E57FF', color: '#ffffff' }}>
                              {isSuperAdmin ? 'SuperAdmin' : 'Administrador'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Menu Principal */}
                    <div className="space-y-1">
                      {user?.clinica_id && (
                        <button
                          onClick={() => setViewAtual("workspace")}
                          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 rounded-xl transition-all text-left min-h-[60px]"
                        >
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
                            <Building2 className="w-5 h-5" style={{ color: '#7E57FF' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base" style={{ color: '#202124' }}>Minha Clínica</p>
                            <p className="text-sm truncate" style={{ color: '#80868b' }}>{clinicaAtual?.nome || 'PREVENCLIN'}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: '#dadce0' }} />
                        </button>
                      )}

                      <button
                        onClick={() => setViewAtual("billing")}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 rounded-xl transition-all text-left min-h-[60px]"
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
                          <CreditCard className="w-5 h-5" style={{ color: '#7E57FF' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-base" style={{ color: '#202124' }}>Plano & Pagamentos</p>
                          <p className="text-sm" style={{ color: '#80868b' }}>{planoAtual?.nome || 'Starter'}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: '#dadce0' }} />
                      </button>

                      <button
                        onClick={() => setViewAtual("ia")}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 rounded-xl transition-all text-left min-h-[60px]"
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fef9e5' }}>
                          <Zap className="w-5 h-5" style={{ color: '#f59e0b' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-base" style={{ color: '#202124' }}>IA & Créditos</p>
                          <p className="text-sm" style={{ color: '#80868b' }}>{creditosIA?.disponiveis || 0} créditos disponíveis</p>
                        </div>
                        <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: '#dadce0' }} />
                      </button>

                      <button
                        onClick={() => setViewAtual("account")}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 rounded-xl transition-all text-left min-h-[60px]"
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
                          <User className="w-5 h-5" style={{ color: '#7E57FF' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-base" style={{ color: '#202124' }}>Minha Conta</p>
                          <p className="text-sm" style={{ color: '#80868b' }}>Perfil e senha</p>
                        </div>
                        <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: '#dadce0' }} />
                      </button>

                      {user?.role === 'admin' && (
                        <a
                          href={createPageUrl("SuperAdmin")}
                          onClick={() => setMenuAberto(false)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 rounded-xl transition-all text-left min-h-[60px]"
                        >
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fde7e7' }}>
                            <Shield className="w-5 h-5" style={{ color: '#ea4335' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base" style={{ color: '#202124' }}>SuperAdmin</p>
                            <p className="text-sm" style={{ color: '#80868b' }}>Painel administrativo</p>
                          </div>
                          <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: '#dadce0' }} />
                        </a>
                      )}
                    </div>

                    {/* Logout */}
                    <div className="mt-2 pt-4" style={{ borderTop: '1px solid #e8eaed' }}>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50 rounded-xl transition-all min-h-[56px]"
                        style={{ color: '#ea4335' }}
                      >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        <span className="font-semibold text-base">Sair da Conta</span>
                        </button>
                    </div>
                  </div>
                )}

                {/* WORKSPACE VIEW */}
                {viewAtual === "workspace" && (
                  <div className="p-6">
                    {clinicaAtual && (
                      <>
                        <div className="mb-6">
                          <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Nome da Clínica</label>
                          <input
                            type="text"
                            value={clinicaAtual.nome}
                            disabled
                            className="w-full px-4 py-3 border rounded-xl text-base"
                            style={{ borderColor: '#e8eaed', backgroundColor: '#f8f9fa', color: '#202124' }}
                          />
                        </div>

                        <div className="mb-6">
                          <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>CNPJ</label>
                          <input
                            type="text"
                            value={clinicaAtual.cnpj || "Não informado"}
                            disabled
                            className="w-full px-4 py-3 border rounded-xl text-base"
                            style={{ borderColor: '#e8eaed', backgroundColor: '#f8f9fa', color: '#202124' }}
                          />
                        </div>

                        <div className="mb-6">
                          <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Localização</label>
                          <input
                            type="text"
                            value={`${clinicaAtual.cidade || ""}, ${clinicaAtual.estado || ""}`}
                            disabled
                            className="w-full px-4 py-3 border rounded-xl text-base"
                            style={{ borderColor: '#e8eaed', backgroundColor: '#f8f9fa', color: '#202124' }}
                          />
                        </div>

                        <button
                          onClick={() => {
                            setMenuAberto(false);
                            window.location.href = createPageUrl("ConfiguracaoClinica");
                          }}
                          className="w-full px-6 py-3.5 rounded-xl text-white font-semibold hover:opacity-90 transition-all min-h-[52px] text-base"
                          style={{ backgroundColor: '#7E57FF' }}
                        >
                          Editar Dados da Clínica
                        </button>
                      </>
                    )}

                    {isSuperAdmin && clinicas.length > 0 && (
                      <div className="mt-8">
                        <h3 className="text-base font-bold mb-4" style={{ color: '#202124' }}>Todas as Clínicas ({clinicas.length})</h3>
                        <div className="space-y-2 max-h-80 overflow-y-auto pc-scrollbar">
                          {clinicas.map((clinica) => (
                            <div key={clinica.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 rounded-xl border transition-all" style={{ borderColor: '#e8eaed' }}>
                              <Building2 className="w-5 h-5 flex-shrink-0" style={{ color: '#7E57FF' }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate" style={{ color: '#202124' }}>{clinica.nome}</p>
                                <p className="text-sm truncate" style={{ color: '#80868b' }}>{clinica.cidade} • {clinica.plano_assinatura}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* BILLING VIEW */}
                {viewAtual === "billing" && (
                  <div className="p-6">
                    {planoAtual && (
                      <div className="mb-6 p-5 rounded-2xl border-2 overflow-hidden" style={{ borderColor: '#7E57FF', backgroundColor: '#f5f3ff' }}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold" style={{ color: '#5f6368' }}>Plano Atual</span>
                          <button
                            onClick={() => {
                              setMenuAberto(false);
                              window.location.href = createPageUrl("PlanosPrecos");
                            }}
                            className="px-4 py-2 text-sm font-semibold rounded-xl hover:opacity-90 transition-all"
                            style={{ backgroundColor: '#7E57FF', color: '#ffffff' }}
                          >
                            Upgrade
                          </button>
                        </div>
                        <p className="text-3xl font-bold mb-2" style={{ color: '#7E57FF' }}>{planoAtual.nome}</p>
                        <p className="text-base font-medium" style={{ color: '#5f6368' }}>
                          R$ {(planoAtual.preco_mensal || 0).toFixed(2)}/mês
                        </p>
                      </div>
                    )}

                    {uso && (
                      <div className="mb-6">
                        <h3 className="text-base font-bold mb-4" style={{ color: '#202124' }}>Uso do Mês</h3>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span style={{ color: '#5f6368' }}>Agendamentos</span>
                              <span className="font-semibold" style={{ color: '#202124' }}>{uso.agendamentos}/1000</span>
                            </div>
                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ 
                                  width: `${Math.min((uso.agendamentos / 1000) * 100, 100)}%`,
                                  backgroundColor: '#7E57FF'
                                }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span style={{ color: '#5f6368' }}>Pacientes Ativos</span>
                              <span className="font-semibold" style={{ color: '#202124' }}>{uso.pacientes}/100</span>
                            </div>
                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ 
                                  width: `${Math.min((uso.pacientes / 100) * 100, 100)}%`,
                                  backgroundColor: '#34a853'
                                }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span style={{ color: '#5f6368' }}>Chamadas IA</span>
                              <span className="font-semibold" style={{ color: '#202124' }}>{uso.ia_chamadas}/300</span>
                            </div>
                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ 
                                  width: `${Math.min((uso.ia_chamadas / 300) * 100, 100)}%`,
                                  backgroundColor: '#f59e0b'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setMenuAberto(false);
                        window.location.href = createPageUrl("GerenciarAssinatura");
                      }}
                      className="w-full px-6 py-3.5 rounded-xl border-2 font-semibold hover:bg-gray-50 transition-all min-h-[52px] text-base"
                      style={{ borderColor: '#7E57FF', color: '#7E57FF' }}
                    >
                      Ver Detalhes do Plano
                    </button>
                  </div>
                )}

                {/* IA & CRÉDITOS VIEW */}
                {viewAtual === "ia" && (
                  <div className="p-6">
                    <div className="mb-6 p-6 rounded-2xl overflow-hidden" style={{ backgroundColor: '#fef9e5', border: '2px solid #fbbc04' }}>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#f59e0b20' }}>
                          <Zap className="w-8 h-8" style={{ color: '#f59e0b' }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1" style={{ color: '#956802' }}>Créditos Disponíveis</p>
                          <p className="text-4xl font-bold" style={{ color: '#f59e0b' }}>
                            {creditosIA?.disponiveis || 0}
                          </p>
                        </div>
                      </div>
                      <div className="h-3 bg-white/70 rounded-full overflow-hidden mb-2">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${Math.min(((creditosIA?.disponiveis || 0) / (creditosIA?.total || 1)) * 100, 100)}%`,
                            backgroundColor: '#f59e0b'
                          }}
                        />
                      </div>
                      <p className="text-sm font-medium" style={{ color: '#956802' }}>
                        {((creditosIA?.disponiveis || 0) / (creditosIA?.total || 1) * 100).toFixed(0)}% restante
                      </p>
                    </div>

                    <div className="space-y-3 mb-6">
                      <h3 className="text-base font-bold mb-4" style={{ color: '#202124' }}>Configurações de IA</h3>
                      
                      <div className="p-4 rounded-xl border transition-all" style={{ borderColor: '#e8eaed' }}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-semibold" style={{ color: '#202124' }}>Diagnóstico Assistido</label>
                          <input type="checkbox" defaultChecked className="w-5 h-5 rounded" style={{ accentColor: '#7E57FF' }} />
                        </div>
                        <p className="text-sm" style={{ color: '#80868b' }}>Permitir IA sugerir diagnósticos</p>
                      </div>

                      <div className="p-4 rounded-xl border transition-all" style={{ borderColor: '#e8eaed' }}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-semibold" style={{ color: '#202124' }}>Prescrição Inteligente</label>
                          <input type="checkbox" defaultChecked className="w-5 h-5 rounded" style={{ accentColor: '#7E57FF' }} />
                        </div>
                        <p className="text-sm" style={{ color: '#80868b' }}>Sugestões de medicamentos</p>
                      </div>

                      <div className="p-4 rounded-xl border transition-all" style={{ borderColor: '#e8eaed' }}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-semibold" style={{ color: '#202124' }}>Alertas de Interação</label>
                          <input type="checkbox" defaultChecked className="w-5 h-5 rounded" style={{ accentColor: '#7E57FF' }} />
                        </div>
                        <p className="text-sm" style={{ color: '#80868b' }}>Verificar interações medicamentosas</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setMenuAberto(false);
                        window.location.href = createPageUrl("RecargaCreditos");
                      }}
                      className="w-full px-6 py-3.5 rounded-xl text-white font-semibold hover:opacity-90 transition-all min-h-[52px] text-base flex items-center justify-center gap-2"
                      style={{ backgroundColor: '#f59e0b' }}
                    >
                      <Zap className="w-5 h-5" />
                      Recarregar Créditos
                    </button>
                  </div>
                )}

                {/* ACCOUNT VIEW */}
                {viewAtual === "account" && (
                  <div className="p-6">
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Email</label>
                        <input
                          type="email"
                          value={user?.email}
                          disabled
                          className="w-full px-4 py-3 border rounded-xl text-base"
                          style={{ borderColor: '#e8eaed', backgroundColor: '#f8f9fa', color: '#202124' }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Nome Completo</label>
                        <input
                          type="text"
                          value={user?.full_name}
                          disabled
                          className="w-full px-4 py-3 border rounded-xl text-base"
                          style={{ borderColor: '#e8eaed', backgroundColor: '#f8f9fa', color: '#202124' }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2" style={{ color: '#202124' }}>Telefone</label>
                        <input
                          type="tel"
                          placeholder="Digite seu telefone"
                          className="w-full px-4 py-3 border rounded-xl focus:border-[#7E57FF] focus:ring-2 focus:ring-[#f5f3ff] outline-none text-base"
                          style={{ borderColor: '#e8eaed' }}
                        />
                        <p className="text-sm mt-2" style={{ color: '#80868b' }}>
                          Para receber notificações SMS
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <h3 className="text-base font-bold mb-4" style={{ color: '#202124' }}>Preferências</h3>
                      
                      <div className="p-4 rounded-xl border transition-all" style={{ borderColor: '#e8eaed' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <label className="text-sm font-semibold" style={{ color: '#202124' }}>Notificações por Email</label>
                            <p className="text-sm mt-1" style={{ color: '#80868b' }}>Alertas e atualizações</p>
                          </div>
                          <input type="checkbox" defaultChecked className="w-5 h-5 rounded" style={{ accentColor: '#7E57FF' }} />
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border transition-all" style={{ borderColor: '#e8eaed' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <label className="text-sm font-semibold" style={{ color: '#202124' }}>Modo Escuro</label>
                            <p className="text-sm mt-1" style={{ color: '#80868b' }}>Tema do aplicativo</p>
                          </div>
                          <input type="checkbox" className="w-5 h-5 rounded" style={{ accentColor: '#7E57FF' }} />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setMenuAberto(false);
                        window.location.href = createPageUrl("ConfiguracaoUsuario");
                      }}
                      className="w-full px-6 py-3.5 rounded-xl border-2 font-semibold hover:bg-gray-50 transition-all min-h-[52px] text-base"
                      style={{ borderColor: '#7E57FF', color: '#7E57FF' }}
                    >
                      Editar Preferências
                    </button>
                  </div>
                )}

                      {user?.role === 'admin' && (
                        <a
                          href={createPageUrl("SuperAdmin")}
                          onClick={() => setMenuAberto(false)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 rounded-xl transition-all text-left min-h-[60px]"
                        >
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#fde7e7' }}>
                            <Shield className="w-5 h-5" style={{ color: '#ea4335' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base" style={{ color: '#202124' }}>SuperAdmin</p>
                            <p className="text-sm" style={{ color: '#80868b' }}>Painel administrativo</p>
                          </div>
                          <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: '#dadce0' }} />
                        </a>
                      )}

                      <a
                        href={createPageUrl("ConfiguracoesGerais")}
                        onClick={() => setMenuAberto(false)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 rounded-xl transition-all text-left min-h-[60px]"
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
                          <Settings className="w-5 h-5" style={{ color: '#7E57FF' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-base" style={{ color: '#202124' }}>Settings</p>
                          <p className="text-sm" style={{ color: '#80868b' }}>Preferências</p>
                        </div>
                        <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: '#dadce0' }} />
                      </a>

                      {user?.clinica_id && (
                        <a
                          href={createPageUrl("GerenciarAssinatura")}
                          onClick={() => setMenuAberto(false)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 rounded-xl transition-all text-left min-h-[60px]"
                        >
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5f3ff' }}>
                            <CreditCard className="w-5 h-5" style={{ color: '#7E57FF' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base" style={{ color: '#202124' }}>Billing</p>
                            <p className="text-sm" style={{ color: '#80868b' }}>{planoAtual?.nome || 'Starter'}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: '#dadce0' }} />
                        </a>
                      )}
                </div>
              </div>
            </div>

            {/* Desktop Dropdown - Simple Menu */}
            <div className="hidden md:block">
              <div 
                className="fixed inset-0 z-[80]" 
                onClick={() => setMenuAberto(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-[320px] bg-white z-[90] rounded-2xl shadow-2xl overflow-hidden border" style={{ borderColor: '#e8eaed' }}>
                {/* User Info */}
                <div className="p-4" style={{ borderBottom: '1px solid #e8eaed' }}>
                  <p className="font-bold truncate" style={{ color: '#202124', fontSize: '15px' }}>{user?.full_name}</p>
                  <p className="text-sm truncate" style={{ color: '#80868b' }}>{user?.email}</p>
                </div>

                {/* Menu Items */}
                <div className="p-2">
                  {user?.clinica_id && clinicaAtual && (
                    <div className="px-3 py-2 mb-2" style={{ borderBottom: '1px solid #f1f3f4' }}>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#80868b' }}>Workspaces</p>
                      <button className="w-full text-left px-2 py-1.5 hover:bg-gray-50 rounded-lg transition-all">
                        <p className="font-medium truncate" style={{ color: '#202124', fontSize: '14px' }}>{clinicaAtual.nome}</p>
                      </button>
                      {isSuperAdmin && clinicas.length > 1 && (
                        <button 
                          onClick={() => {
                            setMenuAberto(false);
                            window.location.href = createPageUrl("SuperAdmin");
                          }}
                          className="w-full text-left px-2 py-1.5 hover:bg-gray-50 rounded-lg transition-all mt-1 flex items-center gap-2"
                        >
                          <Plus className="w-3.5 h-3.5" style={{ color: '#7E57FF' }} />
                          <p className="font-medium" style={{ color: '#7E57FF', fontSize: '14px' }}>Outras clínicas ({clinicas.length - 1})</p>
                        </button>
                      )}
                    </div>
                  )}

                  {user?.role === 'admin' && (
                    <a
                      href={createPageUrl("SuperAdmin")}
                      onClick={() => setMenuAberto(false)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-xl transition-all min-h-[44px]"
                    >
                      <Shield className="w-5 h-5 flex-shrink-0" style={{ color: '#ea4335' }} />
                      <span className="font-medium" style={{ color: '#202124', fontSize: '14px' }}>SuperAdmin</span>
                    </a>
                  )}

                  <a
                    href={createPageUrl("ConfiguracaoUsuario")}
                    onClick={() => setMenuAberto(false)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-xl transition-all min-h-[44px]"
                  >
                    <Settings className="w-5 h-5 flex-shrink-0" style={{ color: '#5f6368' }} />
                    <span className="font-medium" style={{ color: '#202124', fontSize: '14px' }}>Preferências</span>
                  </a>

                  {user?.clinica_id && (
                    <a
                      href={createPageUrl("GerenciarAssinatura")}
                      onClick={() => setMenuAberto(false)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-xl transition-all min-h-[44px]"
                    >
                      <CreditCard className="w-5 h-5 flex-shrink-0" style={{ color: '#5f6368' }} />
                      <span className="font-medium" style={{ color: '#202124', fontSize: '14px' }}>Plano & Pagamentos</span>
                    </a>
                  )}
                </div>

                {/* Logout */}
                <div className="p-2" style={{ borderTop: '1px solid #e8eaed' }}>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-50 rounded-xl transition-all min-h-[44px]"
                    style={{ color: '#ea4335' }}
                  >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium" style={{ fontSize: '14px' }}>Sair</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}