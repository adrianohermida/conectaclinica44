import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const ESTADOS_BRASIL = [
  { sigla: "AC", nome: "Acre", regiao: "Norte", codigo_ibge: "12" },
  { sigla: "AL", nome: "Alagoas", regiao: "Nordeste", codigo_ibge: "27" },
  { sigla: "AP", nome: "Amapá", regiao: "Norte", codigo_ibge: "16" },
  { sigla: "AM", nome: "Amazonas", regiao: "Norte", codigo_ibge: "13" },
  { sigla: "BA", nome: "Bahia", regiao: "Nordeste", codigo_ibge: "29" },
  { sigla: "CE", nome: "Ceará", regiao: "Nordeste", codigo_ibge: "23" },
  { sigla: "DF", nome: "Distrito Federal", regiao: "Centro-Oeste", codigo_ibge: "53" },
  { sigla: "ES", nome: "Espírito Santo", regiao: "Sudeste", codigo_ibge: "32" },
  { sigla: "GO", nome: "Goiás", regiao: "Centro-Oeste", codigo_ibge: "52" },
  { sigla: "MA", nome: "Maranhão", regiao: "Nordeste", codigo_ibge: "21" },
  { sigla: "MT", nome: "Mato Grosso", regiao: "Centro-Oeste", codigo_ibge: "51" },
  { sigla: "MS", nome: "Mato Grosso do Sul", regiao: "Centro-Oeste", codigo_ibge: "50" },
  { sigla: "MG", nome: "Minas Gerais", regiao: "Sudeste", codigo_ibge: "31" },
  { sigla: "PA", nome: "Pará", regiao: "Norte", codigo_ibge: "15" },
  { sigla: "PB", nome: "Paraíba", regiao: "Nordeste", codigo_ibge: "25" },
  { sigla: "PR", nome: "Paraná", regiao: "Sul", codigo_ibge: "41" },
  { sigla: "PE", nome: "Pernambuco", regiao: "Nordeste", codigo_ibge: "26" },
  { sigla: "PI", nome: "Piauí", regiao: "Nordeste", codigo_ibge: "22" },
  { sigla: "RJ", nome: "Rio de Janeiro", regiao: "Sudeste", codigo_ibge: "33" },
  { sigla: "RN", nome: "Rio Grande do Norte", regiao: "Nordeste", codigo_ibge: "24" },
  { sigla: "RS", nome: "Rio Grande do Sul", regiao: "Sul", codigo_ibge: "43" },
  { sigla: "RO", nome: "Rondônia", regiao: "Norte", codigo_ibge: "11" },
  { sigla: "RR", nome: "Roraima", regiao: "Norte", codigo_ibge: "14" },
  { sigla: "SC", nome: "Santa Catarina", regiao: "Sul", codigo_ibge: "42" },
  { sigla: "SP", nome: "São Paulo", regiao: "Sudeste", codigo_ibge: "35" },
  { sigla: "SE", nome: "Sergipe", regiao: "Nordeste", codigo_ibge: "28" },
  { sigla: "TO", nome: "Tocantins", regiao: "Norte", codigo_ibge: "17" }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Verificar se já existem estados
    const estadosExistentes = await base44.asServiceRole.entities.Estado.list();
    
    if (estadosExistentes.length > 0) {
      return Response.json({ 
        message: 'Estados já populados', 
        total: estadosExistentes.length 
      });
    }

    // Criar estados em batch
    await base44.asServiceRole.entities.Estado.bulkCreate(ESTADOS_BRASIL);

    return Response.json({ 
      success: true,
      message: '27 estados brasileiros populados com sucesso',
      total: ESTADOS_BRASIL.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});