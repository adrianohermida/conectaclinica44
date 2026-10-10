import React from "react";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

/**
 * GUIA DE ATOMICIDADE - Princípios de componentização
 * Garantia: nenhum módulo > 50 linhas, zero duplicação
 */
export default function AtomicityGuide() {
  const principles = [
    {
      title: "Componente < 50 linhas",
      rule: "Se passar de 50 linhas, quebrar em múltiplos componentes",
      why: "Manutenibilidade, testabilidade, reusabilidade",
      example: {
        wrong: "FormularioPacienteCompleto.js (300 linhas)",
        right: "FormularioPaciente.js (30) + DadosPessoais.js (20) + DadosMedicos.js (20)"
      }
    },
    {
      title: "Uma Responsabilidade",
      rule: "Cada componente faz UMA coisa e faz bem",
      why: "Single Responsibility Principle (SOLID)",
      example: {
        wrong: "PacienteCard (lista + edita + deleta)",
        right: "PacienteCard (display) + PacienteActions (editar/deletar)"
      }
    },
    {
      title: "Props Mínimas",
      rule: "Máximo 5 props. Mais = criar objeto de configuração",
      why: "Legibilidade, facilita uso",
      example: {
        wrong: "<Button color size variant icon loading disabled onClick>",
        right: "<Button config={{variant, size}} onClick>"
      }
    },
    {
      title: "Zero Side Effects",
      rule: "Componente NÃO deve fazer fetch, criar timers, manipular DOM diretamente",
      why: "Predictabilidade, testabilidade",
      example: {
        wrong: "useEffect(() => fetch(...)) dentro do componente",
        right: "Hook customizado (usePacientes) separado"
      }
    },
    {
      title: "Composição > Herança",
      rule: "Preferir composição de componentes pequenos",
      why: "Flexibilidade, reutilização",
      example: {
        wrong: "ComponenteBaseQueHerdaTudo",
        right: "<Card><CardHeader /><CardContent /></Card>"
      }
    }
  ];

  const antiPatterns = [
    "Arquivos > 300 linhas",
    "Componentes com múltiplas responsabilidades",
    "Props drilling > 2 níveis",
    "Estado global desnecessário",
    "Duplicação de lógica entre componentes",
    "Fetch dentro de componentes (usar hooks)",
    "setTimeout/setInterval sem cleanup",
    "Manipulação direta do DOM (usar refs com cuidado)"
  ];

  const checklist = [
    "Componente renderiza UI pura?",
    "Tem < 50 linhas?",
    "Tem < 5 props?",
    "Tem UMA responsabilidade clara?",
    "Pode ser testado isoladamente?",
    "Pode ser reutilizado em outro contexto?",
    "Nome descreve claramente o que faz?",
    "Não tem side effects diretos?"
  ];

  return (
    <div className="space-y-8">
      <div className="p-6 rounded-xl border-2 border-purple-500 bg-purple-50">
        <h2 className="text-2xl font-bold text-purple-800 mb-3">🎯 ATOMICIDADE = NÃO-NEGOCIÁVEL</h2>
        <p className="text-lg text-purple-700">
          Base44 Agent DEVE criar componentes atômicos. Componente grande = ROLLBACK + refactor obrigatório.
        </p>
      </div>

      {/* Princípios */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold">Princípios Fundamentais</h3>
        {principles.map((p, idx) => (
          <div key={idx} className="pc-card p-6">
            <div className="flex items-start gap-3 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h4 className="font-bold text-lg mb-1">{p.title}</h4>
                <p className="text-sm text-gray-700 mb-2">{p.rule}</p>
                <p className="text-xs text-gray-500 italic">Por quê: {p.why}</p>
              </div>
            </div>
            
            {p.example && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-3 rounded-lg bg-red-50 border-2 border-red-500">
                  <p className="text-xs font-bold text-red-700 mb-1">❌ ERRADO:</p>
                  <code className="text-xs text-red-800">{p.example.wrong}</code>
                </div>
                <div className="p-3 rounded-lg bg-green-50 border-2 border-green-500">
                  <p className="text-xs font-bold text-green-700 mb-1">✅ CORRETO:</p>
                  <code className="text-xs text-green-800">{p.example.right}</code>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Anti-Patterns */}
      <div className="pc-card p-6 bg-red-50 border-2 border-red-500">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <XCircle className="w-6 h-6 text-red-600" />
          Anti-Patterns (REJEITAR)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {antiPatterns.map((pattern, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded bg-white border border-red-300">
              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-800">{pattern}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist */}
      <div className="pc-card p-6 bg-green-50 border-2 border-green-500">
        <h3 className="text-xl font-bold mb-4">✅ Checklist Pré-Commit</h3>
        <div className="space-y-2">
          {checklist.map((item, idx) => (
            <label key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-green-300 cursor-pointer hover:border-green-500">
              <input type="checkbox" className="w-5 h-5 rounded" />
              <span className="text-sm font-medium">{item}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Estrutura de Arquivos */}
      <div className="pc-card p-6">
        <h3 className="text-xl font-bold mb-4">📁 Estrutura de Arquivos</h3>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
{`components/
  ui/ (genéricos reutilizáveis)
    ├── Button.js (< 50 linhas)
    ├── Input.js (< 50 linhas)
    ├── Card.js (< 50 linhas)
  
  pacientes/ (domínio específico)
    ├── PacienteCard.js (< 50 linhas)
    ├── PacienteForm.js (< 50 linhas)
    ├── PacienteActions.js (< 50 linhas)
  
  hooks/ (lógica reutilizável)
    ├── usePacientes.js
    ├── useAgenda.js

pages/
  Pacientes.js (orquestra componentes, < 100 linhas)
  Agenda.js (orquestra componentes, < 100 linhas)`}
        </pre>
      </div>

      {/* Métricas de Sucesso */}
      <div className="pc-card p-6 bg-blue-50">
        <h3 className="text-xl font-bold mb-4">📊 Métricas de Sucesso</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-white border">
            <p className="text-2xl font-bold text-blue-600">{'<'} 50</p>
            <p className="text-xs text-gray-600">Linhas/componente</p>
          </div>
          <div className="p-4 rounded-lg bg-white border">
            <p className="text-2xl font-bold text-green-600">{'<'} 5</p>
            <p className="text-xs text-gray-600">Props/componente</p>
          </div>
          <div className="p-4 rounded-lg bg-white border">
            <p className="text-2xl font-bold text-purple-600">0</p>
            <p className="text-xs text-gray-600">Side effects diretos</p>
          </div>
          <div className="p-4 rounded-lg bg-white border">
            <p className="text-2xl font-bold text-orange-600">100%</p>
            <p className="text-xs text-gray-600">Componentes testáveis</p>
          </div>
        </div>
      </div>
    </div>
  );
}