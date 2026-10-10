import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2 } from "lucide-react";

export default function OnboardingClinica() {
  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    telefone: "",
    cidade: "",
    estado: ""
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Gerar slug
      const slug = formData.nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 20);

      const { data } = await base44.entities.Clinica.create({ ...formData, slug });
      
      // Atualizar user com clinica_id
      await base44.auth.updateMe({ clinica_id: data.id });

      // Criar configuração email padrão ConectaClínica com alias
      const aliasRecebimento = `${slug}@conectaclinica.com.br`;
      await base44.entities.ConfiguracaoEmail.create({
        clinica_id: data.id,
        provedor: 'conectaclinica',
        provedor_padrao: true,
        alias_recebimento: aliasRecebimento,
        email_remetente: aliasRecebimento,
        nome_remetente: formData.nome,
        ativo: true,
        inbound_parse_configurado: false
      });

      navigate(createPageUrl('Dashboard'));
    } catch (error) {
      console.error('Erro ao criar clínica:', error);
      alert('Erro ao criar clínica. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <Building2 className="w-16 h-16 text-purple-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configure sua Clínica</h1>
          <p className="text-gray-600">Preencha os dados básicos para começar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Clínica *
            </label>
            <Input
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Clínica São Paulo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CNPJ</label>
            <Input
              value={formData.cnpj}
              onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
              placeholder="00.000.000/0000-00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Telefone *</label>
            <Input
              required
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cidade *</label>
              <Input
                required
                value={formData.cidade}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                placeholder="São Paulo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado *</label>
              <Input
                required
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                placeholder="SP"
                maxLength={2}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {loading ? "Criando..." : "Criar Clínica"}
          </Button>
        </form>
      </div>
    </div>
  );
}