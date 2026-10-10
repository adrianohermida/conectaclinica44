import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Loader2, MapPin } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import SelectEstado from "./SelectEstado";
import SelectMunicipio from "./SelectMunicipio";
import TagInput from "./TagInput";

const ESTADOS_CIVIS = [
  { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" },
  { value: "divorciado", label: "Divorciado(a)" },
  { value: "viuvo", label: "Viúvo(a)" },
  { value: "uniao_estavel", label: "União Estável" }
];

export default function FormularioPacienteCompleto({ contato, onSubmit, onCancel, isLoading, todasTags = [] }) {
  const [formData, setFormData] = useState({
    nome_completo: contato?.nome_completo || "",
    cpf: contato?.cpf || "",
    data_nascimento: contato?.data_nascimento || "",
    nacionalidade: contato?.nacionalidade || "Brasileira",
    estado_civil: contato?.estado_civil || "",
    profissao: contato?.profissao || "",
    sexo: contato?.sexo || "",
    telefones: contato?.telefones || [{ tipo: "celular", numero: "", principal: true }],
    emails: contato?.emails || [{ email: "", tipo: "pessoal", principal: true }],
    redes_sociais: contato?.redes_sociais || {},
    endereco: contato?.endereco || {
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      uf: "",
      codigo_ibge: ""
    },
    convenio: contato?.convenio || "",
    numero_carteirinha: contato?.numero_carteirinha || "",
    status: contato?.status || "ativo",
    observacoes: contato?.observacoes || "",
    tags: contato?.tags || []
  });

  const [buscandoCEP, setBuscandoCEP] = useState(false);

  const handleBuscarCEP = async () => {
    if (!formData.endereco.cep) {
      toast.error("Digite o CEP");
      return;
    }

    setBuscandoCEP(true);
    try {
      const response = await base44.functions.invoke('consultarViaCEP', { cep: formData.endereco.cep });
      const dados = response.data;

      setFormData({
        ...formData,
        endereco: {
          ...formData.endereco,
          logradouro: dados.logradouro,
          bairro: dados.bairro,
          cidade: dados.cidade,
          uf: dados.uf,
          codigo_ibge: dados.codigo_ibge,
          cep: dados.cep
        }
      });

      toast.success("Endereço preenchido automaticamente");
    } catch (error) {
      toast.error(error.response?.data?.error || "Erro ao buscar CEP");
    } finally {
      setBuscandoCEP(false);
    }
  };

  const adicionarTelefone = () => {
    setFormData({
      ...formData,
      telefones: [...formData.telefones, { tipo: "celular", numero: "", principal: false }]
    });
  };

  const removerTelefone = (idx) => {
    setFormData({
      ...formData,
      telefones: formData.telefones.filter((_, i) => i !== idx)
    });
  };

  const adicionarEmail = () => {
    setFormData({
      ...formData,
      emails: [...formData.emails, { email: "", tipo: "pessoal", principal: false }]
    });
  };

  const removerEmail = (idx) => {
    setFormData({
      ...formData,
      emails: formData.emails.filter((_, i) => i !== idx)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validar CEP obrigatório
    if (!formData.endereco.cep) {
      toast.error("CEP obrigatório para emissão de notas fiscais");
      return;
    }

    // Validar formato CEP (8 dígitos)
    const cepLimpo = formData.endereco.cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
      toast.error("CEP inválido - deve ter 8 dígitos");
      return;
    }
    
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Dados Pessoais */}
      <div>
        <h3 className="text-sm font-bold mb-4" style={{ color: '#202124' }}>Dados Pessoais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm md:text-base font-medium mb-1">Nome Completo *</label>
            <Input
              value={formData.nome_completo}
              onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
              required
              className="min-h-[48px] text-base"
            />
          </div>

          <div>
            <label className="block text-sm md:text-base font-medium mb-1">CPF *</label>
            <Input
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
              maxLength={14}
              required
              className="min-h-[48px] text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Data de Nascimento</label>
            <Input
              type="date"
              value={formData.data_nascimento}
              onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nacionalidade</label>
            <Input
              value={formData.nacionalidade}
              onChange={(e) => setFormData({ ...formData, nacionalidade: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Estado Civil</label>
            <Select value={formData.estado_civil} onValueChange={(v) => setFormData({ ...formData, estado_civil: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent style={{ zIndex: 999999 }}>
                {ESTADOS_CIVIS.map(ec => (
                  <SelectItem key={ec.value} value={ec.value}>{ec.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Profissão</label>
            <Input
              value={formData.profissao}
              onChange={(e) => setFormData({ ...formData, profissao: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Sexo</label>
            <Select value={formData.sexo} onValueChange={(v) => setFormData({ ...formData, sexo: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent style={{ zIndex: 999999 }}>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
                <SelectItem value="nao_informado">Não informado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Telefones */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ color: '#202124' }}>Telefones</h3>
          <Button type="button" variant="outline" size="sm" onClick={adicionarTelefone}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-3">
          {formData.telefones.map((tel, idx) => (
            <div key={idx} className="flex gap-2">
              <Select 
                value={tel.tipo} 
                onValueChange={(v) => {
                  const novos = [...formData.telefones];
                  novos[idx].tipo = v;
                  setFormData({ ...formData, telefones: novos });
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 999999 }}>
                  <SelectItem value="celular">Celular</SelectItem>
                  <SelectItem value="fixo">Fixo</SelectItem>
                  <SelectItem value="recado">Recado</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Telefone"
                value={tel.numero}
                onChange={(e) => {
                  const novos = [...formData.telefones];
                  novos[idx].numero = e.target.value;
                  setFormData({ ...formData, telefones: novos });
                }}
                className="flex-1"
              />
              {formData.telefones.length > 1 && (
                <Button type="button" variant="outline" size="icon" onClick={() => removerTelefone(idx)}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Emails */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ color: '#202124' }}>E-mails</h3>
          <Button type="button" variant="outline" size="sm" onClick={adicionarEmail}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-3">
          {formData.emails.map((em, idx) => (
            <div key={idx} className="flex gap-2">
              <Select 
                value={em.tipo} 
                onValueChange={(v) => {
                  const novos = [...formData.emails];
                  novos[idx].tipo = v;
                  setFormData({ ...formData, emails: novos });
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 999999 }}>
                  <SelectItem value="pessoal">Pessoal</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="email"
                placeholder="Email"
                value={em.email}
                onChange={(e) => {
                  const novos = [...formData.emails];
                  novos[idx].email = e.target.value;
                  setFormData({ ...formData, emails: novos });
                }}
                className="flex-1"
              />
              {formData.emails.length > 1 && (
                <Button type="button" variant="outline" size="icon" onClick={() => removerEmail(idx)}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Redes Sociais */}
      <div>
        <h3 className="text-sm font-bold mb-4" style={{ color: '#202124' }}>Redes Sociais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Facebook</label>
            <Input
              placeholder="https://facebook.com/..."
              value={formData.redes_sociais?.facebook || ""}
              onChange={(e) => setFormData({ 
                ...formData, 
                redes_sociais: { ...formData.redes_sociais, facebook: e.target.value }
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Instagram</label>
            <Input
              placeholder="https://instagram.com/..."
              value={formData.redes_sociais?.instagram || ""}
              onChange={(e) => setFormData({ 
                ...formData, 
                redes_sociais: { ...formData.redes_sociais, instagram: e.target.value }
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">LinkedIn</label>
            <Input
              placeholder="https://linkedin.com/in/..."
              value={formData.redes_sociais?.linkedin || ""}
              onChange={(e) => setFormData({ 
                ...formData, 
                redes_sociais: { ...formData.redes_sociais, linkedin: e.target.value }
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">TikTok</label>
            <Input
              placeholder="https://tiktok.com/@..."
              value={formData.redes_sociais?.tiktok || ""}
              onChange={(e) => setFormData({ 
                ...formData, 
                redes_sociais: { ...formData.redes_sociais, tiktok: e.target.value }
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">X (Twitter)</label>
            <Input
              placeholder="https://x.com/..."
              value={formData.redes_sociais?.twitter || ""}
              onChange={(e) => setFormData({ 
                ...formData, 
                redes_sociais: { ...formData.redes_sociais, twitter: e.target.value }
              })}
            />
          </div>
        </div>
      </div>

      {/* Endereço */}
      <div>
        <h3 className="text-sm font-bold mb-4" style={{ color: '#202124' }}>Endereço</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">CEP *</label>
              <Input
                placeholder="00000-000"
                value={formData.endereco.cep}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  endereco: { ...formData.endereco, cep: e.target.value }
                })}
                maxLength={9}
                required
              />
            </div>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleBuscarCEP}
              disabled={buscandoCEP}
              className="mt-6"
            >
              {buscandoCEP ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            </Button>
          </div>

          <div />

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Logradouro *</label>
            <Input
              placeholder="Rua, Avenida..."
              value={formData.endereco.logradouro}
              onChange={(e) => setFormData({ 
                ...formData, 
                endereco: { ...formData.endereco, logradouro: e.target.value }
              })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Número *</label>
            <Input
              placeholder="Número"
              value={formData.endereco.numero}
              onChange={(e) => setFormData({ 
                ...formData, 
                endereco: { ...formData.endereco, numero: e.target.value }
              })}
              required
            />
          </div>

          <div>
            <Input
              placeholder="Complemento"
              value={formData.endereco.complemento}
              onChange={(e) => setFormData({ 
                ...formData, 
                endereco: { ...formData.endereco, complemento: e.target.value }
              })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Bairro *</label>
            <Input
              placeholder="Bairro"
              value={formData.endereco.bairro}
              onChange={(e) => setFormData({ 
                ...formData, 
                endereco: { ...formData.endereco, bairro: e.target.value }
              })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cidade *</label>
            <SelectMunicipio
              value={formData.endereco.cidade}
              onChange={(cidade) => setFormData({ 
                ...formData, 
                endereco: { ...formData.endereco, cidade }
              })}
              uf={formData.endereco.uf}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Estado *</label>
            <SelectEstado
              value={formData.endereco.uf}
              onChange={(uf) => setFormData({ 
                ...formData, 
                endereco: { ...formData.endereco, uf }
              })}
            />
          </div>
        </div>
      </div>

      {/* Convênio */}
      <div>
        <h3 className="text-sm font-bold mb-4" style={{ color: '#202124' }}>Convênio</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              placeholder="Nome do Convênio"
              value={formData.convenio}
              onChange={(e) => setFormData({ ...formData, convenio: e.target.value })}
            />
          </div>
          <div>
            <Input
              placeholder="Número da Carteirinha"
              value={formData.numero_carteirinha}
              onChange={(e) => setFormData({ ...formData, numero_carteirinha: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium mb-1">Tags</label>
        <TagInput
          tags={formData.tags}
          onChange={(tags) => setFormData({ ...formData, tags })}
          suggestions={todasTags}
        />
      </div>

      {/* Observações */}
      <div>
        <label className="block text-sm font-medium mb-1">Observações</label>
        <Textarea
          value={formData.observacoes}
          onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
          rows={4}
        />
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium mb-1">Status</label>
        <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={{ zIndex: 999999 }}>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
            <SelectItem value="prospecto">Prospecto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 min-h-[48px]">
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1 min-h-[48px]">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
        </Button>
      </div>
    </form>
  );
}