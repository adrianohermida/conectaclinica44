import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { 
  FileText, RefreshCw, Zap, CheckCircle2, Clock, XCircle, 
  PlayCircle, Code, Activity, TrendingUp, Download, Eye, Plus, Edit, Trash2, TestTube
} from "lucide-react";
import { toast } from "react-hot-toast";
import SlideInPanel from "@/components/ui/SlideInPanel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SuperAdminAutentique() {
  const [graphqlQuery, setGraphqlQuery] = useState('');
  const [testDocId, setTestDocId] = useState('');
  const [showConectorForm, setShowConectorForm] = useState(false);
  const [editingConector, setEditingConector] = useState(null);
  const [conectorForm, setConectorForm] = useState({
    nome: '',
    ambiente: 'sandbox',
    webhook_url: '',
    secret_key_ref: 'AUTENTIQUE_SECRET_KEY',
    formato: 'JSON',
    autenticacao_hmac: true,
    ip_fixo: false,
    eventos_ativos: ['document.created', 'document.updated', 'document.deleted', 'document.finished']
  });
  const queryClient = useQueryClient();

  // Conectores
  const { data: conectores = [] } = useQuery({
    queryKey: ['conectores-autentique'],
    queryFn: () => base44.entities.ConectorAutentique.list('-created_date')
  });

  // Logs de assinatura digital
  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['assinatura-logs'],
    queryFn: () => base44.entities.AssinaturaDigitalLog.list('-created_date', 50)
  });

  // Documentos ConteudoLegal com ESign
  const { data: documentos = [] } = useQuery({
    queryKey: ['conteudo-legal-esign'],
    queryFn: async () => {
      const docs = await base44.entities.ConteudoLegal.list();
      return docs.filter(d => d.integracao_esign?.requer_assinatura);
    }
  });

  // Criar conector
  const criarConectorMutation = useMutation({
    mutationFn: (data) => base44.entities.ConectorAutentique.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['conectores-autentique']);
      setShowConectorForm(false);
      setEditingConector(null);
      toast.success("Conector criado!");
    }
  });

  // Atualizar conector
  const atualizarConectorMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ConectorAutentique.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['conectores-autentique']);
      setShowConectorForm(false);
      setEditingConector(null);
      toast.success("Conector atualizado!");
    }
  });

  // Deletar conector
  const deletarConectorMutation = useMutation({
    mutationFn: (id) => base44.entities.ConectorAutentique.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['conectores-autentique']);
      toast.success("Conector deletado!");
    }
  });

  // Teste GraphQL manual
  const testGraphQLMutation = useMutation({
    mutationFn: async ({ conectorId, query }) => {
      const { data } = await base44.functions.invoke('testarGraphQLAutentique', {
        conector_id: conectorId,
        query
      });
      return data;
    },
    onSuccess: (data, variables) => {
      const conector = conectores.find(c => c.id === variables.conectorId);
      
      // Atualizar estatísticas do conector
      atualizarConectorMutation.mutate({
        id: variables.conectorId,
        data: {
          ...conector,
          ultimo_teste: {
            data: new Date().toISOString(),
            status: data.errors ? 'erro' : 'sucesso',
            response_schema: data,
            latencia_ms: data.latencia_ms || 0,
            erro_detalhes: data.errors ? JSON.stringify(data.errors) : null
          },
          estatisticas: {
            ...conector.estatisticas,
            total_testes_executados: (conector.estatisticas?.total_testes_executados || 0) + 1
          }
        }
      });
      
      toast.success("Query executada! Schema mapeado.");
      console.log('GraphQL Response:', data);
    },
    onError: (error) => {
      toast.error("Erro ao executar query: " + error.message);
    }
  });

  // Sync status documento
  const syncStatusMutation = useMutation({
    mutationFn: async (docId) => {
      const { data } = await base44.functions.invoke('autentiqueSyncStatus', {
        documento_id: docId
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['conteudo-legal-esign']);
      toast.success("Status atualizado!");
    }
  });

  // Estatísticas
  const stats = {
    total: logs.length,
    enviados: logs.filter(l => l.status === 'enviado').length,
    concluidos: logs.filter(l => l.status === 'concluido').length,
    taxa_sucesso: logs.length > 0 ? ((logs.filter(l => l.status === 'concluido').length / logs.length) * 100).toFixed(1) : 0
  };

  const handleSubmitConector = (e) => {
    e.preventDefault();
    if (editingConector) {
      atualizarConectorMutation.mutate({ id: editingConector.id, data: conectorForm });
    } else {
      criarConectorMutation.mutate(conectorForm);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Autentique API Console"
        description="Gerenciamento de conectores, testes e monitoramento"
        breadcrumbs={[
          { label: "SuperAdmin", url: "/SuperAdmin" },
          { label: "Plataforma" },
          { label: "Integrações" },
          { label: "Playground" },
          { label: "Autentique" }
        ]}
        action={
          <Button onClick={() => {
            setEditingConector(null);
            setConectorForm({
              nome: '',
              ambiente: 'sandbox',
              webhook_url: '',
              secret_key_ref: 'AUTENTIQUE_SECRET_KEY',
              formato: 'JSON',
              autenticacao_hmac: true,
              ip_fixo: false,
              eventos_ativos: ['document.created', 'document.updated', 'document.deleted', 'document.finished']
            });
            setShowConectorForm(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Conector
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Conectores Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{conectores.filter(c => c.ativo).length}</span>
              <Zap className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Assinaturas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{stats.total}</span>
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Concluídos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-green-600">{stats.concluidos}</span>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Taxa Sucesso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-blue-600">{stats.taxa_sucesso}%</span>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="conectores" className="w-full">
        <TabsList>
          <TabsTrigger value="conectores">Conectores</TabsTrigger>
          <TabsTrigger value="logs">Logs Assinaturas</TabsTrigger>
          <TabsTrigger value="documentos">Documentos ESign</TabsTrigger>
          <TabsTrigger value="console">Console GraphQL</TabsTrigger>
        </TabsList>

        {/* Conectores */}
        <TabsContent value="conectores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conectores Autentique</CardTitle>
            </CardHeader>
            <CardContent>
              {conectores.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Nenhum conector configurado</div>
              ) : (
                <div className="space-y-3">
                  {conectores.map(conector => (
                    <div key={conector.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{conector.nome}</h3>
                            <Badge className={conector.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {conector.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                            <Badge variant="outline">{conector.ambiente}</Badge>
                          </div>
                          
                          <p className="text-xs text-gray-500 font-mono mb-2">{conector.webhook_url}</p>
                          
                          {conector.ultimo_teste && (
                            <div className="flex items-center gap-2 text-sm">
                              <Badge className={
                                conector.ultimo_teste.status === 'sucesso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }>
                                Último teste: {conector.ultimo_teste.status}
                              </Badge>
                              {conector.ultimo_teste.latencia_ms && (
                                <span className="text-gray-600">{conector.ultimo_teste.latencia_ms}ms</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (!conectores[0]) return;
                              testGraphQLMutation.mutate({
                                conectorId: conector.id,
                                query: '{ documents(limit: 1) { id name created_at } }'
                              });
                            }}
                            disabled={testGraphQLMutation.isPending}
                          >
                            <TestTube className="w-4 h-4 mr-2" />
                            Testar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingConector(conector);
                              setConectorForm(conector);
                              setShowConectorForm(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm('Deletar conector?')) {
                                deletarConectorMutation.mutate(conector.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {conector.eventos_ativos?.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-medium mb-2">Eventos ativos:</p>
                          <div className="flex flex-wrap gap-1">
                            {conector.eventos_ativos.map(ev => (
                              <Badge key={ev} variant="outline" className="text-xs">{ev}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Assinaturas Digitais</CardTitle>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="text-center py-8 text-gray-500">Carregando...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Nenhuma assinatura registrada</div>
              ) : (
                <div className="space-y-3">
                  {logs.map(log => (
                    <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{log.documento_nome}</h3>
                            <Badge className={
                              log.status === 'concluido' ? 'bg-green-100 text-green-800' :
                              log.status === 'enviado' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {log.status}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            Provider: <span className="font-mono text-purple-600">{log.provider}</span>
                          </p>
                          
                          {log.autentique_document_id && (
                            <p className="text-xs text-gray-500 font-mono mb-2">
                              Doc ID: {log.autentique_document_id}
                            </p>
                          )}

                          {log.signatarios?.length > 0 && (
                            <div className="text-sm">
                              <span className="font-medium">Signatários:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {log.signatarios.map((sig, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {sig.email || sig.nome} - {sig.status}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="text-right text-sm text-gray-500">
                          {new Date(log.created_date).toLocaleString('pt-BR')}
                        </div>
                      </div>

                      {log.arquivo_assinado_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3"
                          onClick={async () => {
                            const { data } = await base44.functions.invoke('baixarPDFAssinado', {
                              file_uri: log.arquivo_assinado_url
                            });
                            window.open(data.signed_url, '_blank');
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Baixar PDF Assinado
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentos */}
        <TabsContent value="documentos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentos com E-Signature Ativa</CardTitle>
            </CardHeader>
            <CardContent>
              {documentos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Nenhum documento configurado</div>
              ) : (
                <div className="space-y-3">
                  {documentos.map(doc => (
                    <div key={doc.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{doc.titulo_custom || doc.categoria_custom}</h3>
                          <p className="text-xs text-gray-500 mb-1">ID: {doc.id}</p>
                          <p className="text-sm text-gray-600">Versão: {doc.versao}</p>
                          
                          {doc.integracao_esign?.autentique_document_id && (
                            <>
                              <p className="text-xs text-gray-500 font-mono mt-2">
                                {doc.integracao_esign.autentique_document_id}
                              </p>
                              <Badge className={
                                doc.integracao_esign.autentique_status === 'signed' ? 'bg-green-100 text-green-800' :
                                doc.integracao_esign.autentique_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }>
                                {doc.integracao_esign.autentique_status}
                              </Badge>
                            </>
                          )}
                        </div>

                        <Button
                          size="sm"
                          onClick={() => syncStatusMutation.mutate(doc.id)}
                          disabled={syncStatusMutation.isPending}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Sync Status
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Console GraphQL */}
        <TabsContent value="console" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Console GraphQL Autentique</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Selecionar Conector</label>
                <Select value={conectores[0]?.id || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um conector" />
                  </SelectTrigger>
                  <SelectContent>
                    {conectores.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome} ({c.ambiente})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Query GraphQL</label>
                <textarea
                  value={graphqlQuery}
                  onChange={(e) => setGraphqlQuery(e.target.value)}
                  placeholder={`query {
  documents(limit: 10) {
    id
    name
    created_at
    signatures {
      email
      signed { created_at }
    }
  }
}`}
                  className="w-full h-64 p-3 border rounded-lg font-mono text-sm"
                />
              </div>

              <Button
                onClick={() => {
                  if (!conectores[0]) {
                    toast.error("Crie um conector primeiro!");
                    return;
                  }
                  testGraphQLMutation.mutate({
                    conectorId: conectores[0].id,
                    query: graphqlQuery
                  });
                }}
                disabled={testGraphQLMutation.isPending || !graphqlQuery.trim() || conectores.length === 0}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Executar Query
              </Button>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs font-mono text-gray-600">
                  Endpoint: https://api.autentique.com.br/v2/graphql
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Veja console do navegador para schema de resposta completo
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Conector */}
      <SlideInPanel open={showConectorForm} onClose={() => setShowConectorForm(false)} title={editingConector ? "Editar Conector" : "Novo Conector"}>
        <form onSubmit={handleSubmitConector} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nome *</label>
            <Input
              value={conectorForm.nome}
              onChange={(e) => setConectorForm({...conectorForm, nome: e.target.value})}
              placeholder="Produção, Sandbox, Homologação..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Ambiente *</label>
            <Select value={conectorForm.ambiente} onValueChange={(v) => setConectorForm({...conectorForm, ambiente: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent style={{ zIndex: 999999 }}>
                <SelectItem value="sandbox">Sandbox</SelectItem>
                <SelectItem value="producao">Produção</SelectItem>
                <SelectItem value="homologacao">Homologação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Webhook URL *</label>
            <Input
              value={conectorForm.webhook_url}
              onChange={(e) => setConectorForm({...conectorForm, webhook_url: e.target.value})}
              placeholder="https://preview-sandbox--1e9513dabbee57ad37196f69e3b4605b.base44.app/webhookAutentique"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Secret Key Reference</label>
            <Input
              value={conectorForm.secret_key_ref}
              onChange={(e) => setConectorForm({...conectorForm, secret_key_ref: e.target.value})}
              placeholder="AUTENTIQUE_SECRET_KEY"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={conectorForm.autenticacao_hmac}
                onChange={(e) => setConectorForm({...conectorForm, autenticacao_hmac: e.target.checked})}
                className="w-4 h-4"
              />
              <label className="text-sm">Autenticação HMAC SHA-256</label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={conectorForm.ip_fixo}
                onChange={(e) => setConectorForm({...conectorForm, ip_fixo: e.target.checked})}
                className="w-4 h-4"
              />
              <label className="text-sm">IP Fixo</label>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setShowConectorForm(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1 bg-purple-600">
              {editingConector ? 'Atualizar' : 'Criar'} Conector
            </Button>
          </div>
        </form>
      </SlideInPanel>
    </div>
  );
}