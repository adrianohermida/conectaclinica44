import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as XLSX from 'xlsx';
import { 
  Upload, X, Check, AlertCircle, Loader2, Download, 
  FileSpreadsheet, ChevronRight, RefreshCw, Copy, RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * IMPORTADOR BRUTAL DE CONTATOS - OTIMIZADO PARA PREVENCLIN
 * - Suporte XLS, XLSX, CSV (vírgula e ponto-e-vírgula)
 * - Detecção de duplicados com opções de atualizar ou ignorar
 * - Mapeamento inteligente, validação em lote
 * - Batch processing para volumes grandes
 */
export default function ImportadorContatosAvancado({ clinicaId, onSuccess, onClose, user }) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Mapeamento, 3: Preview/Duplicados, 4: Importação
  const [arquivo, setArquivo] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [preview, setPreview] = useState([]);
  const [mapeamento, setMapeamento] = useState({});
  const [validando, setValidando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState({ total: 0, processados: 0, erros: 0, atualizados: 0, ignorados: 0 });
  const [errosValidacao, setErrosValidacao] = useState([]);
  const [duplicados, setDuplicados] = useState([]);
  const [decisoesDuplicados, setDecisoesDuplicados] = useState({}); // { cpf: 'atualizar' | 'ignorar' | 'manter_ambos' }

  // CAMPOS DO CONTATO (schema)
  const camposDisponiveis = [
    { value: 'nome_completo', label: 'Nome Completo', required: true },
    { value: 'cpf', label: 'CPF', required: false },
    { value: 'telefone_principal', label: 'Telefone Principal', required: false },
    { value: 'email_principal', label: 'Email Principal', required: false },
    { value: 'data_nascimento', label: 'Data de Nascimento', required: false },
    { value: 'genero', label: 'Gênero', required: false },
    { value: 'profissao', label: 'Profissão', required: false },
    { value: 'empresa', label: 'Empresa', required: false },
    { value: 'endereco_rua', label: 'Endereço - Rua', required: false },
    { value: 'endereco_numero', label: 'Endereço - Número', required: false },
    { value: 'endereco_bairro', label: 'Endereço - Bairro', required: false },
    { value: 'endereco_cidade', label: 'Endereço - Cidade', required: false },
    { value: 'endereco_uf', label: 'Endereço - UF', required: false },
    { value: 'endereco_cep', label: 'Endereço - CEP', required: false },
    { value: 'tipo_contato', label: 'Tipo de Contato', required: false },
    { value: 'status', label: 'Status', required: false },
    { value: 'tags', label: 'Tags (separadas por vírgula)', required: false },
    { value: 'observacoes', label: 'Observações', required: false }
  ];

  // STEP 1: Upload e parse (CSV, XLS, XLSX)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xls', 'xlsx'].includes(ext)) {
      toast.error('Apenas CSV, XLS ou XLSX são aceitos');
      return;
    }

    setArquivo(file);
    toast.info('Processando arquivo...');

    try {
      if (ext === 'csv') {
        // Parse CSV com detecção de delimitador
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target.result;
          parseCSV(text);
        };
        reader.readAsText(file, 'UTF-8');
      } else {
        // Parse XLS/XLSX com biblioteca xlsx
        const reader = new FileReader();
        reader.onload = (event) => {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false });
          
          if (jsonData.length < 2) {
            toast.error('Planilha deve ter ao menos cabeçalho e 1 linha de dados');
            return;
          }

          const headersRow = jsonData[0].map(h => String(h || '').trim());
          const dataRows = jsonData.slice(1).filter(row => row.some(cell => cell));

          processarDados(headersRow, dataRows);
        };
        reader.readAsArrayBuffer(file);
      }
    } catch (error) {
      console.error('[Importador] Erro ao processar:', error);
      toast.error(`Erro: ${error.message}`);
    }
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(l => l.trim());
    
    if (lines.length < 2) {
      toast.error('CSV deve ter ao menos cabeçalho e 1 linha de dados');
      return;
    }

    // Detectar delimitador (vírgula, ponto-e-vírgula ou tab)
    const firstLine = lines[0];
    const delimiters = [',', ';', '\t'];
    const delimiter = delimiters.reduce((best, del) => {
      const count = (firstLine.match(new RegExp(`\\${del}`, 'g')) || []).length;
      const bestCount = (firstLine.match(new RegExp(`\\${best}`, 'g')) || []).length;
      return count > bestCount ? del : best;
    });

    console.log('[Importador] Delimitador detectado:', delimiter === '\t' ? 'TAB' : delimiter);

    // Parse com suporte a aspas
    const rows = lines.map(line => {
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          values.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^"|"$/g, ''));
      return values;
    });

    const headersRow = rows[0].map(h => h.trim());
    const dataRows = rows.slice(1);

    processarDados(headersRow, dataRows);
  };

  const processarDados = (headersRow, dataRows) => {
    setHeaders(headersRow);
    setPreview(dataRows.slice(0, 5)); // Preview: primeiras 5 linhas
    setCsvData(dataRows);

    // AUTO-MAPEAMENTO inteligente
    const autoMap = {};
    headersRow.forEach(header => {
      const headerLower = header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      if (headerLower.includes('nome') && !headerLower.includes('empresa')) autoMap[header] = 'nome_completo';
      if (headerLower.includes('cpf')) autoMap[header] = 'cpf';
      if (headerLower.includes('telefone') || headerLower.includes('celular') || headerLower.includes('phone') || headerLower.includes('fone')) autoMap[header] = 'telefone_principal';
      if (headerLower.includes('email') || headerLower.includes('e-mail') || headerLower.includes('mail')) autoMap[header] = 'email_principal';
      if (headerLower.includes('nascimento') || headerLower.includes('birth') || headerLower.includes('nasc')) autoMap[header] = 'data_nascimento';
      if (headerLower.includes('genero') || headerLower.includes('sexo') || headerLower.includes('gender')) autoMap[header] = 'genero';
      if (headerLower.includes('profissao') || headerLower.includes('ocupacao') || headerLower.includes('profession')) autoMap[header] = 'profissao';
      if (headerLower.includes('empresa') || headerLower.includes('company')) autoMap[header] = 'empresa';
      if ((headerLower.includes('rua') || headerLower.includes('logradouro') || headerLower.includes('street')) && !headerLower.includes('numero')) autoMap[header] = 'endereco_rua';
      if (headerLower.includes('numero') && (headerLower.includes('end') || headerLower.includes('casa') || headerLower.includes('n°'))) autoMap[header] = 'endereco_numero';
      if (headerLower.includes('bairro') || headerLower.includes('neighborhood')) autoMap[header] = 'endereco_bairro';
      if (headerLower.includes('cidade') || headerLower.includes('city') || headerLower.includes('municipio')) autoMap[header] = 'endereco_cidade';
      if ((headerLower.includes('uf') || headerLower.includes('estado') || headerLower.includes('state')) && headerLower.length <= 10) autoMap[header] = 'endereco_uf';
      if (headerLower.includes('cep') || headerLower.includes('zip')) autoMap[header] = 'endereco_cep';
      if (headerLower.includes('tipo') && !headerLower.includes('contato')) autoMap[header] = 'tipo_contato';
      if (headerLower.includes('status')) autoMap[header] = 'status';
      if (headerLower.includes('tag')) autoMap[header] = 'tags';
      if (headerLower.includes('obs') || headerLower.includes('nota') || headerLower.includes('observ')) autoMap[header] = 'observacoes';
    });

    setMapeamento(autoMap);
    setStep(2);
    toast.success(`${dataRows.length} registros detectados`);
  };

  // STEP 2: Validar e detectar duplicados
  const handleValidar = async () => {
    console.log('[Importador] VALIDAR CHAMADO - clinicaId:', clinicaId, 'user:', user);
    
    const temNome = Object.values(mapeamento).includes('nome_completo');
    if (!temNome) {
      toast.error('Campo "Nome Completo" é obrigatório - mapeie ao menos essa coluna');
      return;
    }

    setValidando(true);
    setErrosValidacao([]);
    setDuplicados([]);

    const erros = [];
    const duplicadosDetectados = [];

    // Buscar contatos existentes para detectar duplicados
    let contatosExistentes = [];
    try {
      if (clinicaId) {
        contatosExistentes = await base44.entities.Contato.filter({ clinica_id: clinicaId });
        console.log('[Importador] Contatos existentes:', contatosExistentes.length);
      }
    } catch (error) {
      console.error('[Importador] Erro ao buscar contatos:', error);
      toast.warning('Não foi possível verificar duplicados - continuando sem detecção');
    }
    const cpfsExistentes = new Map(contatosExistentes.filter(c => c.cpf).map(c => [c.cpf, c]));
    const emailsExistentes = new Map(contatosExistentes.filter(c => c.emails?.[0]?.email).map(c => [c.emails[0].email, c]));
    
    console.log('[Importador] BD:', contatosExistentes.length, 'contatos | CPFs:', cpfsExistentes.size);

    // Validar amostra (primeiras 100) e detectar duplicados em TODOS
    csvData.forEach((row, idx) => {
      const getNomeIdx = () => headers.indexOf(Object.keys(mapeamento).find(k => mapeamento[k] === 'nome_completo'));
      const getCpfIdx = () => {
        const col = Object.keys(mapeamento).find(k => mapeamento[k] === 'cpf');
        return col ? headers.indexOf(col) : -1;
      };
      const getEmailIdx = () => {
        const col = Object.keys(mapeamento).find(k => mapeamento[k] === 'email_principal');
        return col ? headers.indexOf(col) : -1;
      };

      const nome = row[getNomeIdx()]?.trim();
      const cpf = row[getCpfIdx()]?.trim().replace(/\D/g, '');
      const email = row[getEmailIdx()]?.trim();

      // Validação básica (apenas primeiras 100)
      if (idx < 100) {
        if (!nome || nome.length < 3) {
          erros.push({ linha: idx + 2, erro: 'Nome muito curto ou vazio' });
        }

        if (cpf && cpf.length !== 11) {
          erros.push({ linha: idx + 2, erro: 'CPF inválido' });
        }

        if (email && !email.includes('@')) {
          erros.push({ linha: idx + 2, erro: 'Email inválido' });
        }
      }

      // DETECÇÃO DE DUPLICADOS (todos os registros)
      let contatoExistente = null;
      let tipoDuplicacao = null;

      if (cpf && cpfsExistentes.has(cpf)) {
        contatoExistente = cpfsExistentes.get(cpf);
        tipoDuplicacao = 'cpf';
      } else if (email && emailsExistentes.has(email)) {
        contatoExistente = emailsExistentes.get(email);
        tipoDuplicacao = 'email';
      }

      if (contatoExistente) {
        duplicadosDetectados.push({
          linha: idx + 2,
          novoNome: nome,
          existenteNome: contatoExistente.nome_completo,
          existenteId: contatoExistente.id,
          tipoDuplicacao,
          cpf,
          email,
          rowData: row
        });
      }
    });

    setErrosValidacao(erros.slice(0, 20));
    setDuplicados(duplicadosDetectados);
    
    // Inicializar decisões como "ignorar" por padrão
    const decisoesIniciais = {};
    duplicadosDetectados.forEach(dup => {
      const key = dup.cpf || dup.email || `linha_${dup.linha}`;
      decisoesIniciais[key] = 'ignorar';
    });
    setDecisoesDuplicados(decisoesIniciais);

    setValidando(false);

    if (erros.length > 0) {
      toast.warning(`${erros.length} erros encontrados - revise ou prossiga`);
    } else {
      toast.success('✅ Validação concluída');
    }

    if (duplicadosDetectados.length > 0) {
      toast.info(`⚠️ ${duplicadosDetectados.length} duplicados - escolha ação para cada`);
    }

    console.log('[Importador] ✅ Avançando para step 3');
    setStep(3);
  };

  // STEP 3: Importação com tratamento de duplicados
  const handleImportar = async () => {
    setImportando(true);
    setProgresso({ total: csvData.length, processados: 0, erros: 0, atualizados: 0, ignorados: 0 });

    const BATCH_SIZE = 50;
    const batches = [];
    
    for (let i = 0; i < csvData.length; i += BATCH_SIZE) {
      batches.push(csvData.slice(i, i + BATCH_SIZE));
    }

    let totalProcessados = 0;
    let totalErros = 0;
    let totalAtualizados = 0;
    let totalIgnorados = 0;

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      const offset = batchIdx * BATCH_SIZE;

      const operacoes = await Promise.all(batch.map(async (row, idx) => {
        try {
          const contatoData = { clinica_id: clinicaId };

          // Mapear dados
          Object.keys(mapeamento).forEach(csvCol => {
            const campo = mapeamento[csvCol];
            const valor = row[headers.indexOf(csvCol)]?.toString().trim();

            if (!valor) return;

            if (campo === 'nome_completo') contatoData.nome_completo = valor;
            if (campo === 'cpf') contatoData.cpf = valor.replace(/\D/g, '');
            if (campo === 'data_nascimento') contatoData.data_nascimento = valor;
            if (campo === 'genero') contatoData.genero = valor;
            if (campo === 'profissao') contatoData.profissao = valor;
            if (campo === 'empresa') contatoData.empresa = valor;
            if (campo === 'tipo_contato') contatoData.tipo_contato = valor;
            if (campo === 'status') contatoData.status = valor;
            if (campo === 'observacoes') contatoData.observacoes = valor;

            if (campo === 'telefone_principal') {
              contatoData.telefones = [{ numero: valor, tipo: 'celular', principal: true }];
            }

            if (campo === 'email_principal') {
              contatoData.emails = [{ email: valor, tipo: 'pessoal', principal: true }];
            }

            if (campo.startsWith('endereco_')) {
              if (!contatoData.endereco) contatoData.endereco = {};
              const enderecoCampo = campo.replace('endereco_', '');
              contatoData.endereco[enderecoCampo] = valor;
            }

            if (campo === 'tags') {
              contatoData.tags = valor.split(',').map(t => t.trim()).filter(Boolean);
            }
          });

          // Defaults
          contatoData.tipo_contato = contatoData.tipo_contato || 'paciente';
          contatoData.status = contatoData.status || 'ativo';
          contatoData.origem_lead = 'importacao_arquivo';

          if (!contatoData.nome_completo) {
            return { tipo: 'erro', motivo: 'Nome ausente' };
          }

          // Verificar se é duplicado
          const cpf = contatoData.cpf;
          const email = contatoData.emails?.[0]?.email;
          const key = cpf || email || `linha_${offset + idx + 2}`;
          const decisao = decisoesDuplicados[key];
          
          const duplicado = duplicados.find(d => d.linha === (offset + idx + 2));

          if (duplicado && decisao === 'ignorar') {
            return { tipo: 'ignorado', cpf };
          }

          if (duplicado && decisao === 'atualizar') {
            // Atualizar registro existente
            await base44.entities.Contato.update(duplicado.existenteId, contatoData);
            return { tipo: 'atualizado', cpf };
          }

          // Criar novo (decisão 'manter_ambos' ou não é duplicado)
          await base44.entities.Contato.create(contatoData);
          return { tipo: 'criado', cpf };

        } catch (error) {
          console.error('[Importador] Erro:', error);
          return { tipo: 'erro', motivo: error.message };
        }
      }));

      // Contabilizar resultados
      operacoes.forEach(op => {
        if (op.tipo === 'criado') totalProcessados++;
        if (op.tipo === 'atualizado') totalAtualizados++;
        if (op.tipo === 'ignorado') totalIgnorados++;
        if (op.tipo === 'erro') totalErros++;
      });

      setProgresso({ 
        total: csvData.length, 
        processados: totalProcessados, 
        erros: totalErros,
        atualizados: totalAtualizados,
        ignorados: totalIgnorados
      });

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setImportando(false);
    
    const mensagem = `✅ ${totalProcessados} novos, ${totalAtualizados} atualizados, ${totalIgnorados} ignorados${totalErros > 0 ? `, ${totalErros} erros` : ''}`;
    toast.success(mensagem);
    
    onSuccess?.();
    setTimeout(() => onClose(), 2000);
  };

  // Template CSV de exemplo
  const baixarTemplate = () => {
    const template = 
      "nome_completo;cpf;telefone_principal;email_principal;data_nascimento;genero;profissao;endereco_rua;endereco_numero;endereco_bairro;endereco_cidade;endereco_uf;endereco_cep;tipo_contato;status;tags\n" +
      "João Silva;12345678901;11987654321;joao@email.com;1990-01-15;masculino;Médico;Rua das Flores;123;Centro;São Paulo;SP;01000-000;paciente;ativo;vip;retorno\n" +
      "Maria Santos;98765432100;11876543210;maria@email.com;1985-05-20;feminino;Advogada;Av. Paulista;1000;Bela Vista;São Paulo;SP;01310-000;paciente;ativo;marketing";
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_contatos_prevenclin.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Template baixado');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div>
            <h2 className="text-xl font-bold">Importador Avançado - Prevenclin</h2>
            <p className="text-sm text-purple-100 mt-1">
              {step === 1 && "Upload do arquivo (CSV, XLS, XLSX)"}
              {step === 2 && "Mapeamento automático de colunas"}
              {step === 3 && "Tratamento de duplicados e validação"}
              {step === 4 && "Importando registros..."}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 p-4 bg-gray-50 border-b">
          {[1, 2, 3].map(s => (
            <React.Fragment key={s}>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                step >= s ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <ChevronRight className={`w-4 h-4 ${step > s ? 'text-purple-600' : 'text-gray-400'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: Upload */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-bold text-sm text-blue-900 mb-2">Formatos Aceitos</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✅ CSV (vírgula, ponto-e-vírgula ou tab)</li>
                  <li>✅ XLS / XLSX (Excel)</li>
                  <li>✅ Detecção automática de duplicados (CPF e Email)</li>
                  <li>✅ Processamento em lote (até 10.000 registros)</li>
                </ul>
              </div>

              <div className="text-center">
                <Button variant="outline" onClick={baixarTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Template CSV
                </Button>
              </div>

              <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-purple-300 rounded-xl cursor-pointer hover:bg-purple-50 transition-colors">
                <FileSpreadsheet className="w-12 h-12 text-purple-600 mb-3" />
                <span className="text-lg font-medium text-gray-700">Arraste CSV/Excel aqui</span>
                <span className="text-sm text-gray-500 mt-1">ou clique para selecionar</span>
                <input 
                  type="file" 
                  accept=".csv,.xls,.xlsx" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>

              {arquivo && (
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{arquivo.name}</p>
                    <p className="text-xs text-gray-600">{(arquivo.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Check className="w-5 h-5 text-green-600" />
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Mapeamento */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-800 font-medium">
                  ✨ Mapeamento automático aplicado! Revise e ajuste conforme necessário.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {headers.map((header, idx) => (
                  <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Coluna: <span className="text-purple-600 font-bold">{header}</span>
                    </label>
                    <Select
                      value={mapeamento[header] || 'nao_importar'}
                      onValueChange={(value) => {
                        if (value === 'nao_importar') {
                          const novo = { ...mapeamento };
                          delete novo[header];
                          setMapeamento(novo);
                        } else {
                          setMapeamento(prev => ({ ...prev, [header]: value }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Não importar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nao_importar">❌ Não importar</SelectItem>
                        {camposDisponiveis.map(campo => (
                          <SelectItem key={campo.value} value={campo.value}>
                            {campo.label} {campo.required && '⭐'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-purple-50 p-3 border-b">
                  <h3 className="font-bold text-sm">Preview (5 primeiras linhas)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        {headers.map((h, idx) => (
                          <th key={idx} className="p-2 text-left font-medium">
                            {h}
                            {mapeamento[h] && (
                              <div className="text-purple-600 text-[10px] mt-1 font-bold">
                                → {camposDisponiveis.find(c => c.value === mapeamento[h])?.label}
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          {row.map((cell, cellIdx) => (
                            <td key={cellIdx} className="p-2">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Validação + Duplicados */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Erros de Validação */}
              {errosValidacao.length > 0 && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-3 mb-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">
                        {errosValidacao.length} erros de validação
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Corrija o arquivo ou prossiga ignorando linhas com erro
                      </p>
                    </div>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {errosValidacao.map((erro, idx) => (
                      <div key={idx} className="text-xs bg-white p-2 rounded">
                        <span className="font-bold">Linha {erro.linha}:</span> {erro.erro}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Duplicados Detectados */}
              {duplicados.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-orange-50 p-4 border-b border-orange-200">
                    <div className="flex items-start gap-3">
                      <Copy className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold text-orange-900">
                          {duplicados.length} duplicados detectados
                        </p>
                        <p className="text-sm text-orange-700 mt-1">
                          Escolha a ação para cada duplicado
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            const todasDecisoes = {};
                            duplicados.forEach(dup => {
                              const key = dup.cpf || dup.email || `linha_${dup.linha}`;
                              todasDecisoes[key] = 'ignorar';
                            });
                            setDecisoesDuplicados(todasDecisoes);
                            toast.success('Todos marcados para ignorar');
                          }}
                        >
                          Ignorar Todos
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            const todasDecisoes = {};
                            duplicados.forEach(dup => {
                              const key = dup.cpf || dup.email || `linha_${dup.linha}`;
                              todasDecisoes[key] = 'atualizar';
                            });
                            setDecisoesDuplicados(todasDecisoes);
                            toast.success('Todos marcados para atualizar');
                          }}
                        >
                          Atualizar Todos
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {duplicados.map((dup, idx) => {
                      const key = dup.cpf || dup.email || `linha_${dup.linha}`;
                      const decisao = decisoesDuplicados[key] || 'ignorar';

                      return (
                        <div key={idx} className="p-4 border-b hover:bg-gray-50">
                          <div className="flex items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                                  Linha {dup.linha}
                                </span>
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-medium">
                                  Duplicado por {dup.tipoDuplicacao === 'cpf' ? 'CPF' : 'Email'}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="bg-blue-50 p-2 rounded">
                                  <p className="font-bold text-blue-900 mb-1">Novo (arquivo)</p>
                                  <p className="text-blue-800">{dup.novoNome}</p>
                                  {dup.cpf && <p className="text-blue-600 mt-1">CPF: {dup.cpf}</p>}
                                  {dup.email && <p className="text-blue-600 mt-1">Email: {dup.email}</p>}
                                </div>
                                <div className="bg-purple-50 p-2 rounded">
                                  <p className="font-bold text-purple-900 mb-1">Existente (BD)</p>
                                  <p className="text-purple-800">{dup.existenteNome}</p>
                                  <p className="text-purple-600 mt-1 text-[10px]">ID: {dup.existenteId.slice(0, 8)}...</p>
                                </div>
                              </div>
                            </div>

                            {/* Ação */}
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => setDecisoesDuplicados(prev => ({ ...prev, [key]: 'ignorar' }))}
                                className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                                  decisao === 'ignorar' 
                                    ? 'bg-gray-600 text-white' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                Ignorar
                              </button>
                              <button
                                onClick={() => setDecisoesDuplicados(prev => ({ ...prev, [key]: 'atualizar' }))}
                                className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                                  decisao === 'atualizar' 
                                    ? 'bg-purple-600 text-white' 
                                    : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                                }`}
                              >
                                Atualizar
                              </button>
                              <button
                                onClick={() => setDecisoesDuplicados(prev => ({ ...prev, [key]: 'manter_ambos' }))}
                                className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                                  decisao === 'manter_ambos' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                }`}
                              >
                                Ambos
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Resumo */}
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-bold text-sm mb-2">Resumo da Importação</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-3 rounded">
                    <p className="text-gray-600">Total de registros</p>
                    <p className="text-2xl font-bold text-purple-600">{csvData?.length || 0}</p>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <p className="text-gray-600">Duplicados</p>
                    <p className="text-2xl font-bold text-orange-600">{duplicados.length}</p>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <p className="text-gray-600">Atualizar</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {Object.values(decisoesDuplicados).filter(d => d === 'atualizar').length}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded">
                    <p className="text-gray-600">Ignorar</p>
                    <p className="text-2xl font-bold text-gray-600">
                      {Object.values(decisoesDuplicados).filter(d => d === 'ignorar').length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Botão Importar */}
              {!importando && (
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Recomeçar
                  </Button>
                  <Button onClick={handleImportar} size="lg">
                    <Upload className="w-5 h-5 mr-2" />
                    Iniciar Importação
                  </Button>
                </div>
              )}

              {/* Progresso */}
              {importando && (
                <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-lg">Importando...</span>
                    <span className="text-sm text-gray-600">
                      {progresso.processados + progresso.atualizados + progresso.ignorados}/{progresso.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                    <div
                      className="bg-purple-600 h-3 rounded-full transition-all"
                      style={{ width: `${((progresso.processados + progresso.atualizados + progresso.ignorados) / progresso.total) * 100}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white p-2 rounded">
                      <p className="text-gray-600">Novos</p>
                      <p className="text-lg font-bold text-green-600">{progresso.processados}</p>
                    </div>
                    <div className="bg-white p-2 rounded">
                      <p className="text-gray-600">Atualizados</p>
                      <p className="text-lg font-bold text-purple-600">{progresso.atualizados}</p>
                    </div>
                    <div className="bg-white p-2 rounded">
                      <p className="text-gray-600">Ignorados</p>
                      <p className="text-lg font-bold text-gray-600">{progresso.ignorados}</p>
                    </div>
                    {progresso.erros > 0 && (
                      <div className="bg-white p-2 rounded">
                        <p className="text-gray-600">Erros</p>
                        <p className="text-lg font-bold text-red-600">{progresso.erros}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {step === 2 && `${csvData?.length || 0} registros • ${headers.length} colunas`}
            {step === 3 && duplicados.length > 0 && (
              <span className="text-orange-600 font-medium">
                ⚠️ {duplicados.length} duplicados requerem atenção
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {step === 2 && (
              <>
                <Button variant="outline" onClick={() => setStep(1)}>
                  Voltar
                </Button>
                <Button onClick={handleValidar} disabled={validando}>
                  {validando ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      Validar e Continuar
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}