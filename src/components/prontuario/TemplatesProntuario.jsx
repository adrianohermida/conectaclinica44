import React, { useState } from "react";
import { FileText, Star, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function TemplatesProntuario({ onAplicarTemplate }) {
  const [copiado, setCopiado] = useState(null);

  const templates = [
    {
      id: "consulta_basica",
      nome: "Consulta Básica",
      tipo: "consulta",
      popular: true,
      dados: {
        tipo_atendimento: "consulta",
        exame_fisico: {
          estado_geral: "BEG",
          pressao_arterial: "120/80",
          frequencia_cardiaca: "72",
          temperatura: "36.5"
        }
      }
    },
    {
      id: "retorno_pos_operatorio",
      nome: "Retorno Pós-Operatório",
      tipo: "retorno",
      popular: true,
      dados: {
        tipo_atendimento: "retorno",
        motivo_consulta: "Retorno pós-operatório",
        queixa_principal: "Avaliação de recuperação pós-cirúrgica",
        exame_fisico: {
          estado_geral: "BEG",
          pressao_arterial: "120/80"
        },
        conduta: "Ferida operatória cicatrizando adequadamente. Manter cuidados. Retorno em 15 dias."
      }
    },
    {
      id: "atendimento_pediatrico",
      nome: "Atendimento Pediátrico",
      tipo: "consulta",
      popular: false,
      dados: {
        tipo_atendimento: "consulta",
        historia_doenca_atual: "Avaliação de crescimento e desenvolvimento",
        exame_fisico: {
          estado_geral: "BEG",
          peso: "",
          altura: "",
          temperatura: "36.5"
        },
        conduta: "Crescimento e desenvolvimento dentro da normalidade. Orientações aos pais."
      }
    },
    {
      id: "hipertensao",
      nome: "Acompanhamento Hipertensão",
      tipo: "retorno",
      popular: true,
      dados: {
        tipo_atendimento: "retorno",
        motivo_consulta: "Acompanhamento de Hipertensão Arterial Sistêmica",
        historia_patologica_pregressa: "HAS (Hipertensão Arterial Sistêmica)",
        exame_fisico: {
          estado_geral: "BEG",
          pressao_arterial: "",
          frequencia_cardiaca: ""
        },
        hipotese_diagnostica: "I10 - Hipertensão Arterial Essencial",
        conduta: "Manter medicação anti-hipertensiva. Orientado dieta hipossódica e prática de atividade física."
      }
    },
    {
      id: "diabetes",
      nome: "Acompanhamento Diabetes",
      tipo: "retorno",
      popular: false,
      dados: {
        tipo_atendimento: "retorno",
        motivo_consulta: "Acompanhamento de Diabetes Mellitus",
        historia_patologica_pregressa: "Diabetes Mellitus tipo 2",
        exame_fisico: {
          estado_geral: "BEG",
          pressao_arterial: "",
          peso: ""
        },
        hipotese_diagnostica: "E11 - Diabetes Mellitus não-insulino dependente",
        conduta: "Ajuste de medicação hipoglicemiante. Solicitados exames de controle glicêmico."
      }
    },
    {
      id: "gripe_resfriado",
      nome: "Gripe/Resfriado",
      tipo: "consulta",
      popular: true,
      dados: {
        tipo_atendimento: "consulta",
        motivo_consulta: "Quadro gripal",
        queixa_principal: "Febre, coriza, tosse e mal-estar",
        historia_doenca_atual: "Paciente refere início de sintomas gripais há 3 dias, com febre, coriza hialina, tosse seca e mal-estar geral.",
        exame_fisico: {
          estado_geral: "REG",
          temperatura: "38.0",
          pressao_arterial: "120/80",
          frequencia_cardiaca: "80"
        },
        hipotese_diagnostica: "J00 - Nasofaringite aguda (resfriado comum)",
        conduta: "Tratamento sintomático. Orientada hidratação e repouso. Retornar se piora ou persistência dos sintomas."
      }
    },
    {
      id: "dermatologico",
      nome: "Consulta Dermatológica",
      tipo: "consulta",
      popular: false,
      dados: {
        tipo_atendimento: "consulta",
        queixa_principal: "Lesão de pele",
        exame_fisico: {
          estado_geral: "BEG",
          pele: "Lesão descrita no exame dermatológico"
        },
        conduta: "Tratamento tópico prescrito. Orientações de cuidados com a pele."
      }
    },
    {
      id: "pre_operatorio",
      nome: "Avaliação Pré-Operatória",
      tipo: "exame",
      popular: false,
      dados: {
        tipo_atendimento: "exame",
        motivo_consulta: "Avaliação pré-operatória",
        exame_fisico: {
          estado_geral: "BEG",
          pressao_arterial: "",
          frequencia_cardiaca: "",
          ausculta_cardiaca: "RCR 2T BNF sem sopros",
          ausculta_respiratoria: "MVU sem RA"
        },
        conduta: "Paciente apto para procedimento cirúrgico do ponto de vista clínico."
      }
    }
  ];

  const aplicarTemplate = (template) => {
    onAplicarTemplate(template.dados);
    setCopiado(template.id);
    setTimeout(() => setCopiado(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-[var(--pc-info-50)] rounded-lg p-4 border border-[var(--pc-info-200)]">
        <h3 className="pc-heading-4 text-[var(--pc-info-900)] mb-1">📋 Templates de Prontuário</h3>
        <p className="pc-body-sm text-[var(--pc-info-800)]">
          Acelere o preenchimento usando templates pré-configurados
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className="pc-card p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-2">
                <FileText className="w-5 h-5 text-[var(--pc-primary)] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="pc-heading-4 text-sm">{template.nome}</h4>
                  <p className="pc-caption capitalize">
                    {template.tipo.replace("_", " ")}
                  </p>
                </div>
              </div>
              {template.popular && (
                <span className="pc-badge bg-[var(--pc-warning-100)] text-[var(--pc-warning-700)] flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  Popular
                </span>
              )}
            </div>

            <button
              onClick={() => aplicarTemplate(template)}
              className="pc-btn-primary w-full flex items-center justify-center gap-2 text-sm"
            >
              {copiado === template.id ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Aplicado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Usar Template
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}