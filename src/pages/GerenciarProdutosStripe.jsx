import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Edit, Save, X, DollarSign, Calendar, Zap, AlertCircle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import RouteGuard from "@/components/auth/RouteGuard";
import usePerformanceTracker from "@/components/hooks/usePerformanceTracker";
import { useOptimizedQuery } from "@/components/hooks/useOptimizedQuery";

export default function GerenciarProdutosStripe() {
  usePerformanceTracker('/GerenciarProdutosStripe');
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState(null);
  const [formEdit, setFormEdit] = useState({});

  const { data: planos = [], isLoading } = useOptimizedQuery({
    queryKey: ["planos-admin"],
    queryFn: () => base44.entities.PlanoAssinatura.list("ordem_exibicao")
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlanoAssinatura.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["planos-admin"]);
      setEditando(null);
      setFormEdit({});
    }
  });

  const iniciarEdicao = (plano) => {
    setEditando(plano.id);
    setFormEdit(plano);
  };

  const salvarEdicao = () => {
    updateMutation.mutate({
      id: editando,
      data: formEdit
    });
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setFormEdit({});
  };

  return (
    <RouteGuard requireAuth={true} requireClinica={false}>
      <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Produtos Stripe"
        description="Preços e limites"
        breadcrumbs={[{ label: "Super Admin" }, { label: "Produtos" }]}
      />

      {/* Aviso Auditoria */}
      <div className="pc-card p-4 bg-[var(--pc-warning-50)] border-2 border-[var(--pc-warning-200)]">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--pc-warning)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="pc-body font-medium text-[var(--pc-warning-800)]">Modo Auditoria</p>
            <p className="pc-body-sm text-[var(--pc-warning-700)] mt-1">
              Ajuste os produtos com base em testes reais de consumo e despesas. Mantenha sincronia com o Stripe Dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Produtos */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="pc-card p-8 text-center">
            <div className="w-8 h-8 border-4 border-[var(--pc-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="pc-body-sm">Carregando produtos...</p>
          </div>
        ) : planos.length === 0 ? (
          <div className="pc-card p-8 text-center">
            <Package className="w-16 h-16 text-[var(--pc-text-tertiary)] mx-auto mb-4" />
            <p className="pc-body-sm">Nenhum produto cadastrado</p>
          </div>
        ) : (
          planos.map((plano) => {
            const emEdicao = editando === plano.id;
            const dados = emEdicao ? formEdit : plano;

            return (
              <div key={plano.id} className="pc-card p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-[var(--pc-primary-50)] rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 md:w-6 md:h-6 text-[var(--pc-primary)]" />
                    </div>
                    <div>
                      {emEdicao ? (
                        <input
                          type="text"
                          value={dados.nome}
                          onChange={(e) => setFormEdit({ ...formEdit, nome: e.target.value })}
                          className="text-xl font-medium text-[#202124] border-b-2 border-[#0B7A9E] focus:outline-none"
                        />
                      ) : (
                        <h3 className="text-xl font-medium text-[#202124]">{dados.nome}</h3>
                      )}
                      <p className="text-sm text-[#5f6368] mt-1">
                        Slug: <code className="bg-[#f1f3f4] px-2 py-0.5 rounded">{dados.slug}</code>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {plano.popular && (
                      <Badge variant="success" icon={<Zap className="w-3 h-3" />}>
                        Popular
                      </Badge>
                    )}
                    <Badge variant={plano.ativo ? "success" : "error"}>
                      {plano.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>

                {/* Descrição */}
                {emEdicao ? (
                  <textarea
                    value={dados.descricao}
                    onChange={(e) => setFormEdit({ ...formEdit, descricao: e.target.value })}
                    className="w-full p-3 border border-[#dadce0] rounded-lg mb-4"
                    rows={2}
                  />
                ) : (
                  <p className="text-sm text-[#5f6368] mb-4">{dados.descricao}</p>
                )}

                {/* Preços */}
                <div className="grid sm:grid-cols-2 gap-3 md:gap-4 mb-4">
                  <div className="bg-[var(--pc-surface-variant)] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-[var(--pc-success)]" />
                      <span className="pc-body-sm font-medium">Preço Mensal</span>
                    </div>
                    {emEdicao ? (
                      <input
                        type="number"
                        value={dados.preco_mensal}
                        onChange={(e) => setFormEdit({ ...formEdit, preco_mensal: Number(e.target.value) })}
                        className="w-full p-2 border border-[#dadce0] rounded"
                        step="0.01"
                      />
                    ) : (
                      <p className="text-2xl font-bold text-[#202124]">
                        R$ {dados.preco_mensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    )}
                    <p className="text-xs text-[#5f6368] mt-1">
                      Price ID: <code className="bg-white px-1 py-0.5 rounded text-[10px]">{dados.stripe_price_id_mensal}</code>
                    </p>
                  </div>

                  <div className="bg-[var(--pc-surface-variant)] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-[var(--pc-info)]" />
                      <span className="pc-body-sm font-medium">Preço Anual</span>
                    </div>
                    {emEdicao ? (
                      <input
                        type="number"
                        value={dados.preco_anual}
                        onChange={(e) => setFormEdit({ ...formEdit, preco_anual: Number(e.target.value) })}
                        className="w-full p-2 border border-[#dadce0] rounded"
                        step="0.01"
                      />
                    ) : (
                      <p className="text-2xl font-bold text-[#202124]">
                        R$ {dados.preco_anual?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "N/A"}
                      </p>
                    )}
                    {dados.desconto_anual_percentual > 0 && (
                      <Badge variant="success" className="mt-1 text-xs">
                        -{dados.desconto_anual_percentual}%
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Limites */}
                <div className="bg-[#f8f9fa] rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-[#202124] mb-3">Limites do Plano</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    {emEdicao ? (
                      <>
                        <div>
                          <label className="text-xs text-[#5f6368]">Usuários</label>
                          <input
                            type="number"
                            value={dados.limites?.max_usuarios}
                            onChange={(e) => setFormEdit({ 
                              ...formEdit, 
                              limites: { ...formEdit.limites, max_usuarios: Number(e.target.value) }
                            })}
                            className="w-full p-1 border border-[#dadce0] rounded mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[#5f6368]">Pacientes</label>
                          <input
                            type="number"
                            value={dados.limites?.max_pacientes}
                            onChange={(e) => setFormEdit({ 
                              ...formEdit, 
                              limites: { ...formEdit.limites, max_pacientes: Number(e.target.value) }
                            })}
                            className="w-full p-1 border border-[#dadce0] rounded mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[#5f6368]">Agendamentos/mês</label>
                          <input
                            type="number"
                            value={dados.limites?.max_agendamentos_mes}
                            onChange={(e) => setFormEdit({ 
                              ...formEdit, 
                              limites: { ...formEdit.limites, max_agendamentos_mes: Number(e.target.value) }
                            })}
                            className="w-full p-1 border border-[#dadce0] rounded mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[#5f6368]">Storage (GB)</label>
                          <input
                            type="number"
                            value={dados.limites?.storage_gb}
                            onChange={(e) => setFormEdit({ 
                              ...formEdit, 
                              limites: { ...formEdit.limites, storage_gb: Number(e.target.value) }
                            })}
                            className="w-full p-1 border border-[#dadce0] rounded mt-1"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div><span className="text-[#5f6368]">Usuários:</span> <strong>{dados.limites?.max_usuarios}</strong></div>
                        <div><span className="text-[#5f6368]">Pacientes:</span> <strong>{dados.limites?.max_pacientes}</strong></div>
                        <div><span className="text-[#5f6368]">Agendamentos/mês:</span> <strong>{dados.limites?.max_agendamentos_mes}</strong></div>
                        <div><span className="text-[#5f6368]">Storage:</span> <strong>{dados.limites?.storage_gb} GB</strong></div>
                        <div><span className="text-[#5f6368]">Telemedicina:</span> <strong>{dados.limites?.telemedicina ? "Sim" : "Não"}</strong></div>
                        <div><span className="text-[#5f6368]">IA:</span> <strong>{dados.limites?.ia_assistida ? "Sim" : "Não"}</strong></div>
                      </>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex justify-end gap-2">
                  {emEdicao ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<X className="w-4 h-4" />}
                        onClick={cancelarEdicao}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Save className="w-4 h-4" />}
                        onClick={salvarEdicao}
                        loading={updateMutation.isPending}
                      >
                        Salvar
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Edit className="w-4 h-4" />}
                      onClick={() => iniciarEdicao(plano)}
                    >
                      Editar
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Instruções */}
      <div className="oneui-card p-6">
        <h3 className="font-medium text-[#202124] mb-3">Instruções de Auditoria</h3>
        <ul className="space-y-2 text-sm text-[#5f6368]">
          <li>✓ Após testes reais, ajuste preços conforme custos operacionais (IA, API, storage)</li>
          <li>✓ Mantenha price_ids sincronizados com Stripe Dashboard</li>
          <li>✓ Monitore consumo médio por plano nas métricas</li>
          <li>✓ Ajuste limites conforme capacidade de infraestrutura</li>
          <li>✓ Teste checkout e webhooks após qualquer alteração</li>
        </ul>
      </div>
      </div>
    </RouteGuard>
  );
}