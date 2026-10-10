import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { AlertTriangle, CheckCircle, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validarCPF, validarEmail, validarTelefone, validarCRM } from "../utils/validacoes";

export default function ValidadorDados() {
  const [validacao, setValidacao] = useState({ total: 0, validos: 0, invalidos: [] });
  const [analisando, setAnalisando] = useState(false);

  const { data: pacientes = [] } = useQuery({
    queryKey: ["pacientes"],
    queryFn: () => base44.entities.Paciente.list(),
    enabled: false
  });

  const { data: medicos = [] } = useQuery({
    queryKey: ["medicos"],
    queryFn: () => base44.entities.Medico.list(),
    enabled: false
  });

  const { data: agendamentos = [] } = useQuery({
    queryKey: ["agendamentos"],
    queryFn: () => base44.entities.Agendamento.list(),
    enabled: false
  });

  const analisarDados = async () => {
    setAnalisando(true);
    const problemas = [];

    // Validar CPFs dos pacientes
    pacientes.forEach(p => {
      if (p.cpf) {
        const valido = validarCPF(p.cpf);
        if (!valido.valido) {
          problemas.push({
            tipo: "CPF Inválido",
            entidade: "Paciente",
            registro: p.nome_completo,
            campo: "cpf",
            valor: p.cpf,
            erro: valido.erro
          });
        }
      }
    });

    // Validar Emails dos pacientes
    pacientes.forEach(p => {
      if (p.email) {
        const valido = validarEmail(p.email);
        if (!valido.valido) {
          problemas.push({
            tipo: "Email Inválido",
            entidade: "Paciente",
            registro: p.nome_completo,
            campo: "email",
            valor: p.email,
            erro: valido.erro
          });
        }
      }
    });

    // Validar Telefones dos pacientes
    pacientes.forEach(p => {
      if (p.telefone) {
        const valido = validarTelefone(p.telefone);
        if (!valido.valido) {
          problemas.push({
            tipo: "Telefone Inválido",
            entidade: "Paciente",
            registro: p.nome_completo,
            campo: "telefone",
            valor: p.telefone,
            erro: valido.erro
          });
        }
      }
    });

    // Validar CRMs dos médicos
    medicos.forEach(m => {
      if (m.crm) {
        const valido = validarCRM(m.crm);
        if (!valido.valido) {
          problemas.push({
            tipo: "CRM Inválido",
            entidade: "Médico",
            registro: m.nome_completo,
            campo: "crm",
            valor: m.crm,
            erro: valido.erro
          });
        }
      }
    });

    // Validar CPF duplicados
    const cpfsUnicos = {};
    pacientes.forEach(p => {
      if (p.cpf) {
        if (cpfsUnicos[p.cpf]) {
          problemas.push({
            tipo: "CPF Duplicado",
            entidade: "Paciente",
            registro: `${cpfsUnicos[p.cpf]} e ${p.nome_completo}`,
            campo: "cpf",
            valor: p.cpf,
            erro: "Dois pacientes com mesmo CPF"
          });
        } else {
          cpfsUnicos[p.cpf] = p.nome_completo;
        }
      }
    });

    // Validar Email duplicados
    const emailsUnicos = {};
    pacientes.forEach(p => {
      if (p.email) {
        if (emailsUnicos[p.email]) {
          problemas.push({
            tipo: "Email Duplicado",
            entidade: "Paciente",
            registro: `${emailsUnicos[p.email]} e ${p.nome_completo}`,
            campo: "email",
            valor: p.email,
            erro: "Dois pacientes com mesmo email"
          });
        } else {
          emailsUnicos[p.email] = p.nome_completo;
        }
      }
    });

    // Validar agendamentos no passado
    const hoje = new Date();
    agendamentos.forEach(ag => {
      const dataAgend = new Date(ag.data);
      if (dataAgend < hoje && ag.status === "agendado") {
        problemas.push({
          tipo: "Agendamento Vencido",
          entidade: "Agendamento",
          registro: ag.paciente_nome,
          campo: "data",
          valor: ag.data,
          erro: "Agendamento no passado ainda como 'agendado'"
        });
      }
    });

    setValidacao({
      total: pacientes.length + medicos.length + agendamentos.length,
      validos: pacientes.length + medicos.length + agendamentos.length - problemas.length,
      invalidos: problemas
    });

    setAnalisando(false);
  };

  return (
    <Card>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="pc-heading-4">Validador de Integridade</h3>
            <p className="pc-body-sm mt-1">Fase 4: Análise de dados existentes</p>
          </div>
          <Button
            onClick={analisarDados}
            disabled={analisando}
            className="pc-btn-secondary inline-flex items-center gap-2"
          >
            {analisando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Analisar Dados
              </>
            )}
          </Button>
        </div>

        {validacao.total > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-[var(--pc-success-50)] border border-[var(--pc-success-200)] rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[var(--pc-success)]" />
                  <div>
                    <p className="pc-caption">Registros Válidos</p>
                    <p className="pc-heading-3 text-[var(--pc-success)]">{validacao.validos}</p>
                  </div>
                </div>
              </div>
              <div className="bg-[var(--pc-error-50)] border border-[var(--pc-error-200)] rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[var(--pc-error)]" />
                  <div>
                    <p className="pc-caption">Problemas Encontrados</p>
                    <p className="pc-heading-3 text-[var(--pc-error)]">{validacao.invalidos.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {validacao.invalidos.length > 0 && (
              <div className="space-y-2">
                <h4 className="pc-heading-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[var(--pc-warning)]" />
                  Problemas Detectados
                </h4>
                {validacao.invalidos.map((prob, idx) => (
                  <div
                    key={idx}
                    className="bg-[var(--pc-warning-50)] border border-[var(--pc-warning-200)] rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="pc-body-sm font-medium text-[var(--pc-warning-800)]">
                          {prob.tipo}: {prob.registro}
                        </p>
                        <p className="pc-caption text-[var(--pc-warning-700)] mt-1">
                          {prob.entidade} • {prob.campo}: "{prob.valor}"
                        </p>
                        <p className="pc-caption text-[var(--pc-error)] mt-1">
                          ⚠️ {prob.erro}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}