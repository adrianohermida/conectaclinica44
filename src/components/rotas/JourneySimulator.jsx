import React, { useState } from "react";
import { Play, Plus, X, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { base44 } from "@/api/base44Client";

export default function JourneySimulator() {
  const [journey, setJourney] = useState({ name: "Onboarding Completo", steps: [
    { path: "/Home", action: "entry" },
    { path: "/PlanosPrecos", action: "link" },
    { path: "/Checkout", action: "cta" },
    { path: "/OnboardingClinica", action: "redirect" },
    { path: "/DashboardCompleto", action: "redirect" }
  ]});
  const [simulating, setSimulating] = useState(false);
  const [report, setReport] = useState(null);
  const [autoDetect, setAutoDetect] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fixingLinks, setFixingLinks] = useState(false);
  const [fixResults, setFixResults] = useState(null);

  const addStep = () => {
    setJourney({
      ...journey,
      steps: [...journey.steps, { path: "", action: "link" }]
    });
  };

  const removeStep = (index) => {
    setJourney({
      ...journey,
      steps: journey.steps.filter((_, i) => i !== index)
    });
  };

  const updateStep = (index, field, value) => {
    const newSteps = [...journey.steps];
    newSteps[index][field] = value;
    setJourney({ ...journey, steps: newSteps });
  };

  const simulate = async () => {
    if (!journey.name || journey.steps.length === 0) {
      alert('Adicione nome e passos');
      return;
    }

    setSimulating(true);
    try {
      const { data } = await base44.functions.invoke('simulateJourney', {
        journey_name: journey.name,
        steps: journey.steps
      });
      setReport(data.report);
    } catch (e) {
      alert('Erro: ' + e.message);
    }
    setSimulating(false);
  };

  const detectJourneys = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('autoDetectJourneys', {});
      setAutoDetect(data);
    } catch (e) {
      alert('Erro: ' + e.message);
    }
    setLoading(false);
  };

  const loadModuleJourney = (moduleName) => {
    if (!autoDetect?.module_journeys[moduleName]) return;
    const mj = autoDetect.module_journeys[moduleName];
    setJourney({
      name: mj.name,
      steps: mj.critical_path.map(s => ({
        path: s.from || s.to,
        action: s.action
      })).filter(s => s.path)
    });
  };

  const handleFixBrokenLinks = async () => {
    if (!confirm('Gerar correções automáticas para links quebrados?')) return;
    setFixingLinks(true);
    try {
      const { data } = await base44.functions.invoke('fixBrokenLinks', {});
      setFixResults(data);
      alert(`✅ ${data.fixes_generated} correções geradas`);
    } catch (e) {
      alert('❌ Erro: ' + e.message);
    }
    setFixingLinks(false);
  };

  return (
    <div className="pc-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Play className="w-5 h-5 text-purple-600" />
          Journey Simulator AUTO
        </h3>
        <div className="flex gap-2">
          <button
            onClick={detectJourneys}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {loading ? 'Detectando...' : '🔍 Auto-Detectar'}
          </button>
          <button
            onClick={handleFixBrokenLinks}
            disabled={fixingLinks}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
          >
            {fixingLinks ? 'Corrigindo...' : '🔧 Fix Links'}
          </button>
        </div>
      </div>

      {/* Fix Results */}
      {fixResults && fixResults.fixes?.length > 0 && (
        <div className="pc-card p-4 mb-4 bg-red-50 border-2 border-red-200">
          <div className="font-bold text-sm text-red-800 mb-3">
            ✅ {fixResults.fixes_generated} Correções Automáticas Geradas
          </div>
          <div className="space-y-2 max-h-60 overflow-auto">
            {fixResults.fixes.map((fix, i) => (
              <div key={i} className="bg-white p-3 rounded-lg border border-red-200">
                <div className="text-xs font-bold mb-1">{fix.page} → {fix.broken_link}</div>
                <div className="text-xs text-gray-600 mb-2">Tipo: {fix.link_type}</div>
                <pre className="text-[10px] bg-gray-50 p-2 rounded overflow-auto max-h-32">
                  {fix.fix_prompt}
                </pre>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(fix.fix_prompt);
                    alert('✅ Prompt copiado');
                  }}
                  className="mt-2 text-xs text-red-600 hover:text-red-700"
                >
                  📋 Copiar Prompt
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {autoDetect && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
          <div className="text-sm font-bold text-red-800 mb-2">
            ⚠️ SCORE NAVEGAÇÃO: {autoDetect.overall_nav_score}/100
          </div>
          <div className="text-xs text-red-700 mb-3">
            {autoDetect.critical_missing_links.filter(l => l.severity === 'critical').length} links CRÍTICOS faltando.
            Drop-off estimado: {autoDetect.summary.estimated_total_drop_off}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(autoDetect.module_journeys).map(([key, mj]) => (
              <button
                key={key}
                onClick={() => loadModuleJourney(key)}
                className="p-2 bg-white rounded border hover:border-purple-500 text-left text-sm"
              >
                <div className="font-bold">{mj.name}</div>
                <div className="text-xs text-gray-600">{mj.critical_path.length} passos</div>
                <div className={`text-xs ${mj.drop_off_risk.includes('CRÍTICO') ? 'text-red-600' : 'text-yellow-600'}`}>
                  {mj.drop_off_risk}
                </div>
              </button>
            ))}
          </div>
          
          <div className="mt-4">
            <div className="text-xs font-bold mb-2">Links Críticos Faltando:</div>
            {autoDetect.critical_missing_links.filter(l => l.severity === 'critical').map((link, i) => (
              <div key={i} className="text-xs bg-white p-2 rounded mb-1">
                <strong>{link.location}:</strong> {link.impact}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <input
          type="text"
          value={journey.name}
          onChange={(e) => setJourney({ ...journey, name: e.target.value })}
          placeholder="Nome da jornada"
          className="w-full px-3 py-2 border rounded-lg"
        />

        <div className="space-y-2">
          {journey.steps.map((step, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={step.path}
                onChange={(e) => updateStep(i, 'path', e.target.value)}
                placeholder="/Path"
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              />
              <select
                value={step.action}
                onChange={(e) => updateStep(i, 'action', e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="link">Link</option>
                <option value="redirect">Redirect</option>
                <option value="cta">CTA</option>
                <option value="entry">Entry</option>
              </select>
              <button
                onClick={() => removeStep(i)}
                className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={addStep}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar Passo
          </button>
          <button
            onClick={simulate}
            disabled={simulating}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {simulating ? 'Simulando...' : 'Simular Jornada'}
          </button>
        </div>

        {report && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border-2">
            <div className="flex items-center gap-2 mb-3">
              {report.completed ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <div className="font-bold">{report.journey_name}</div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-white p-3 rounded">
                <div className="text-xs text-gray-600">Taxa Conversão</div>
                <div className="text-xl font-bold">{report.conversion_rate}%</div>
              </div>
              <div className="bg-white p-3 rounded">
                <div className="text-xs text-gray-600">TTI Total</div>
                <div className="text-xl font-bold">{(report.total_tti_ms/1000).toFixed(1)}s</div>
              </div>
              <div className="bg-white p-3 rounded">
                <div className="text-xs text-gray-600">Passos</div>
                <div className="text-xl font-bold">{report.steps_completed}/{report.total_steps}</div>
              </div>
            </div>

            <div className="space-y-2">
              {report.results.map((r, i) => (
                <div key={i} className={`p-2 rounded text-sm flex items-center gap-2 ${
                  r.status === 'success' ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  {r.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <div className="flex-1">
                    <strong>{r.step}.</strong> {r.path}
                  </div>
                  {r.tti_ms && (
                    <div className="text-xs text-gray-600">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {r.tti_ms.toFixed(0)}ms
                    </div>
                  )}
                </div>
              ))}
            </div>

            {report.recommendations.length > 0 && (
              <div className="mt-3 p-3 bg-yellow-50 rounded">
                <div className="text-xs font-bold mb-2">Recomendações:</div>
                {report.recommendations.map((rec, i) => (
                  <div key={i} className="text-xs text-yellow-800">{rec}</div>
                ))}
              </div>
            )}

            {!report.completed && report.base44_prompt && (
              <div className="mt-4 p-4 bg-blue-50 rounded border-2 border-blue-300">
                <p className="text-blue-900 font-bold mb-2 text-sm">🔧 PROMPT BASE44 (Copie e Execute):</p>
                <pre className="text-xs bg-white p-3 rounded border border-blue-200 overflow-x-auto whitespace-pre-wrap font-mono">
                  {report.base44_prompt}
                </pre>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(report.base44_prompt);
                    alert('✅ Prompt copiado! Cole no chat do Base44.');
                  }}
                  className="mt-2 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 font-medium"
                >
                  📋 Copiar Prompt
                </button>
                
                {report.fix_details && (
                  <div className="mt-3 text-xs text-blue-800 bg-white p-2 rounded border border-blue-200">
                    <p><strong>📂 Arquivo:</strong> {report.fix_details.file}</p>
                    <p><strong>⚡ Ação:</strong> {report.fix_details.action}</p>
                    <p><strong>⏱️ Estimativa:</strong> 5-10min</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}