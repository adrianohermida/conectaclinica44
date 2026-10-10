import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Share2, Mail, Link2, Copy, CheckCircle, Lock, Clock, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CompartilhamentoSeguro({ prontuario, onClose }) {
  const [metodoCompartilhamento, setMetodoCompartilhamento] = useState("email");
  const [destinatario, setDestinatario] = useState("");
  const [nivelAcesso, setNivelAcesso] = useState("leitura");
  const [validadeHoras, setValidadeHoras] = useState(24);
  const [enviando, setEnviando] = useState(false);
  const [linkGerado, setLinkGerado] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const gerarLinkSeguro = async () => {
    setEnviando(true);
    try {
      const response = await base44.functions.invoke('gerarLinkCompartilhamento', {
        documento_id: prontuario.id,
        tipo_documento: 'prontuario',
        nivel_acesso: nivelAcesso,
        validade_horas: validadeHoras
      });
      
      const { link_compartilhamento, token, expiracao } = response.data;
      
      setLinkGerado({
        url: link_compartilhamento,
        token: token,
        expiracao: expiracao,
        nivel_acesso: nivelAcesso
      });
      
      toast.success("Link gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar link:", error);
      toast.error("Erro ao gerar link: " + error.message);
    } finally {
      setEnviando(false);
    }
  };

  const enviarPorEmail = async () => {
    if (!destinatario) {
      toast.error("Informe o e-mail do destinatário");
      return;
    }

    setEnviando(true);
    try {
      const response = await base44.functions.invoke('compartilharDocumento', {
        documento_id: prontuario.id,
        tipo_documento: 'prontuario',
        destinatario_email: destinatario,
        nivel_acesso: nivelAcesso,
        validade_horas: validadeHoras,
        dados_prontuario: {
          paciente_nome: prontuario.paciente_nome,
          data_atendimento: prontuario.data_atendimento,
          medico_nome: prontuario.medico_nome,
          medico_crm: prontuario.medico_crm
        }
      });

      toast.success("✅ Prontuário compartilhado com sucesso via e-mail!");
      onClose();
    } catch (error) {
      console.error("Erro ao enviar:", error);
      toast.error("Erro ao compartilhar prontuário: " + error.message);
    } finally {
      setEnviando(false);
    }
  };

  const copiarLink = () => {
    if (linkGerado) {
      navigator.clipboard.writeText(linkGerado.url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alerta de Segurança */}
      <div className="rounded-xl p-4 border" style={{ backgroundColor: '#fef9e5', borderColor: '#fbbc04' }}>
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#fbbc04' }} />
          <div>
            <h3 className="font-bold mb-1" style={{ color: '#202124', fontSize: '16px' }}>🔒 Compartilhamento Seguro</h3>
            <ul className="space-y-1 text-sm" style={{ color: '#5f6368' }}>
              <li>• Links temporários com expiração automática</li>
              <li>• Acesso registrado em auditoria CFM</li>
              <li>• Tokens únicos e intransferíveis</li>
              <li>• Conformidade com LGPD e Resolução CFM</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Dados do Prontuário */}
      <div className="bg-white rounded-xl p-4 border" style={{ borderColor: '#e8eaed' }}>
        <h3 className="font-bold mb-3" style={{ color: '#202124', fontSize: '16px' }}>Prontuário a Compartilhar</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span style={{ color: '#5f6368' }}>Paciente:</span>
            <span className="font-medium" style={{ color: '#202124' }}>{prontuario.paciente_nome}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#5f6368' }}>Data:</span>
            <span className="font-medium" style={{ color: '#202124' }}>
              {format(new Date(prontuario.data_atendimento), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#5f6368' }}>Médico:</span>
            <span className="font-medium" style={{ color: '#202124' }}>
              Dr(a). {prontuario.medico_nome} - CRM {prontuario.medico_crm}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#5f6368' }}>Versão:</span>
            <span className="font-medium" style={{ color: '#202124' }}>v{prontuario.versao || 1}</span>
          </div>
        </div>
      </div>

      {/* Configurações de Compartilhamento */}
      <div className="space-y-4">
        <div>
          <label className="pc-body-sm font-medium text-[var(--pc-text-secondary)] mb-2 block">Método de Compartilhamento</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMetodoCompartilhamento("email")}
              className={`p-3 rounded-lg border-2 flex items-center gap-2 justify-center pc-transition ${
                metodoCompartilhamento === "email"
                  ? "border-[var(--pc-primary)] bg-[var(--pc-primary-50)] text-[var(--pc-primary)]"
                  : "border-[var(--pc-border-primary)] bg-[var(--pc-surface)] text-[var(--pc-text-secondary)]"
              }`}
            >
              <Mail className="w-4 h-4" />
              <span className="text-sm font-medium">E-mail</span>
            </button>
            <button
              onClick={() => setMetodoCompartilhamento("link")}
              className={`p-3 rounded-lg border-2 flex items-center gap-2 justify-center pc-transition ${
                metodoCompartilhamento === "link"
                  ? "border-[var(--pc-primary)] bg-[var(--pc-primary-50)] text-[var(--pc-primary)]"
                  : "border-[var(--pc-border-primary)] bg-[var(--pc-surface)] text-[var(--pc-text-secondary)]"
              }`}
            >
              <Link2 className="w-4 h-4" />
              <span className="text-sm font-medium">Link</span>
            </button>
          </div>
        </div>

        {metodoCompartilhamento === "email" && (
          <div>
            <label className="pc-body-sm font-medium text-[var(--pc-text-secondary)] mb-2 block">E-mail do Destinatário *</label>
            <Input
              type="email"
              value={destinatario}
              onChange={(e) => setDestinatario(e.target.value)}
              placeholder="medico@exemplo.com.br"
            />
          </div>
        )}

        <div>
          <label className="pc-body-sm font-medium text-[var(--pc-text-secondary)] mb-2 block">Nível de Acesso</label>
          <Select value={nivelAcesso} onValueChange={setNivelAcesso}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="leitura">Somente Leitura</SelectItem>
              <SelectItem value="leitura_download">Leitura + Download</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="pc-body-sm font-medium text-[var(--pc-text-secondary)] mb-2 block">Validade do Link (horas)</label>
          <Select value={String(validadeHoras)} onValueChange={(v) => setValidadeHoras(parseInt(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="1">1 hora</SelectItem>
              <SelectItem value="6">6 horas</SelectItem>
              <SelectItem value="24">24 horas</SelectItem>
              <SelectItem value="72">3 dias</SelectItem>
              <SelectItem value="168">7 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Link Gerado */}
      {linkGerado && metodoCompartilhamento === "link" && (
        <div className="rounded-xl p-4 border" style={{ backgroundColor: '#e6f7ed', borderColor: '#34a853' }}>
          <h4 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#137333', fontSize: '16px' }}>
            <CheckCircle className="w-5 h-5" />
            Link Seguro Gerado
          </h4>
          
          <div className="bg-white rounded-lg p-3 border mb-3" style={{ borderColor: '#34a853' }}>
            <p className="text-xs mb-2 break-all" style={{ color: '#5f6368' }}>{linkGerado.url}</p>
            <button
              onClick={copiarLink}
              className="w-full flex items-center justify-center gap-2 min-h-[44px] rounded-lg font-bold transition-all"
              style={{ backgroundColor: '#34a853', color: '#ffffff', fontSize: '14px' }}
            >
              {copiado ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar Link
                </>
              )}
            </button>
          </div>

          <div className="flex items-start gap-2 text-xs" style={{ color: '#137333' }}>
            <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              Link válido até{" "}
              <strong>{format(new Date(linkGerado.expiracao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1 border border-gray-300"
          disabled={enviando}
        >
          Cancelar
        </Button>
        
        {metodoCompartilhamento === "email" ? (
          <button
            onClick={enviarPorEmail}
            disabled={enviando || !destinatario}
            className="flex-1 min-h-[48px] font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#7E57FF', color: '#ffffff', fontSize: '16px' }}
          >
            {enviando ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                Enviar por E-mail
              </>
            )}
          </button>
        ) : (
          <button
            onClick={gerarLinkSeguro}
            disabled={enviando}
            className="flex-1 min-h-[48px] font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ backgroundColor: '#7E57FF', color: '#ffffff', fontSize: '16px' }}
          >
            {enviando ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Link2 className="w-5 h-5" />
                Gerar Link Seguro
              </>
            )}
          </button>
        )}
      </div>

      {/* Registro de Compartilhamentos */}
      {prontuario.compartilhamentos && prontuario.compartilhamentos.length > 0 && (
        <div className="pc-card p-4">
          <h4 className="pc-heading-4 mb-3">Histórico de Compartilhamentos</h4>
          <div className="space-y-2">
            {prontuario.compartilhamentos.map((comp, idx) => (
              <div key={idx} className="pc-card p-3 pc-caption">
                <div className="flex justify-between">
                  <span className="text-gray-600">Destinatário:</span>
                  <span className="font-medium text-gray-800">{comp.destinatario}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-600">Compartilhado em:</span>
                  <span className="text-gray-700">
                    {new Date(comp.data).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-600">Status:</span>
                  <span className={comp.expirado ? "text-red-600" : "text-green-600"}>
                    {comp.expirado ? "Expirado" : "Ativo"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}