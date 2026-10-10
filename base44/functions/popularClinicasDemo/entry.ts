import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * POPULAR 50 CLÍNICAS DEMO - 2 minutos vs 8h Playwright
 * Cria clínicas + dados completos (contatos, agendamentos, prontuários, vendas)
 * Distribui entre planos Starter/Profissional/Enterprise
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();

    if (!admin || admin.role !== 'admin') {
      return Response.json({ error: 'Apenas admins' }, { status: 403 });
    }

    const { payload } = await req.json();
    const numClinicas = payload?.quantidade || 50;

    const resultados = {
      timestamp: new Date().toISOString(),
      clinicas_criadas: 0,
      dados_criados: {
        contatos: 0,
        agendamentos: 0,
        prontuarios: 0,
        produtos: 0,
        vendas: 0,
        medicos: 0
      },
      tempo_execucao: 0
    };

    const inicio = Date.now();

    // TEMPLATES DE DADOS
    const nomes = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Costa', 'Ferreira', 'Rodrigues', 'Almeida', 'Nascimento'];
    const prenomes = ['João', 'Maria', 'José', 'Ana', 'Pedro', 'Carlos', 'Paulo', 'Lucas', 'Mariana', 'Julia'];
    const cidades = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Brasília', 'Salvador', 'Fortaleza', 'Curitiba', 'Manaus', 'Recife', 'Porto Alegre'];
    const estados = ['SP', 'RJ', 'MG', 'DF', 'BA', 'CE', 'PR', 'AM', 'PE', 'RS'];
    const planos = [
      { slug: 'starter', modulos: ['dashboard', 'agenda', 'pacientes', 'prontuarios'] },
      { slug: 'profissional', modulos: ['dashboard', 'agenda', 'pacientes', 'prontuarios', 'produtos', 'atendimento', 'financeiro'] },
      { slug: 'enterprise', modulos: ['dashboard', 'agenda', 'pacientes', 'prontuarios', 'produtos', 'atendimento', 'administracao', 'relatorios', 'financeiro', 'estoque', 'jornada', 'planos_tratamento', 'analise_ia'] }
    ];

    const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const randomDate = (start, end) => {
      const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
      return date.toISOString().split('T')[0];
    };

    // CRIAR CLÍNICAS EM BULK
    const clinicas = [];
    for (let i = 1; i <= numClinicas; i++) {
      const cidade = randomItem(cidades);
      const estado = estados[cidades.indexOf(cidade)];
      const plano = planos[i % 3];
      
      clinicas.push({
        nome: `Clínica ${cidade} ${i}`,
        cnpj: `${10000000 + i}000001${(i % 99).toString().padStart(2, '0')}`,
        razao_social: `Clínica ${cidade} ${i} LTDA`,
        nome_fantasia: `Clínica ${cidade}`,
        telefone: `(${(i % 89) + 11})9${(9000 + i).toString().padStart(4, '0')}-${(1000 + i).toString().padStart(4, '0')}`,
        email: `clinica${i}@demo.com`,
        endereco: `Rua ${randomItem(nomes)}, ${100 + i}`,
        cidade: cidade,
        estado: estado,
        cep: `${(10000 + i).toString().padStart(5, '0')}-${(i % 999).toString().padStart(3, '0')}`,
        ativa: true,
        data_fundacao: randomDate(new Date(2015, 0, 1), new Date(2023, 11, 31))
      });
    }

    const clinicasCriadas = await base44.asServiceRole.entities.Clinica.bulkCreate(clinicas);
    resultados.clinicas_criadas = clinicasCriadas.length;

    // CRIAR ASSINATURAS PARA CADA CLÍNICA
    const assinaturas = [];
    for (let i = 0; i < clinicasCriadas.length; i++) {
      const clinica = clinicasCriadas[i];
      const plano = planos[i % 3];
      
      assinaturas.push({
        clinica_id: clinica.id,
        clinica_nome: clinica.nome,
        clinica_email: clinica.email,
        plano_slug: plano.slug,
        modulos_inclusos: plano.modulos,
        status: 'ativa',
        data_inicio: randomDate(new Date(2024, 0, 1), new Date()),
        valor_mensal_centavos: plano.slug === 'starter' ? 9700 : plano.slug === 'profissional' ? 29700 : 49700
      });
    }

    await base44.asServiceRole.entities.AssinaturaClinica.bulkCreate(assinaturas);

    // POPULAR DADOS PARA CADA CLÍNICA (BULK)
    const contatos = [];
    const medicos = [];
    const agendamentos = [];
    const prontuarios = [];
    const produtos = [];
    const vendas = [];

    for (const clinica of clinicasCriadas) {
      // 10 CONTATOS POR CLÍNICA
      for (let j = 1; j <= 10; j++) {
        contatos.push({
          clinica_id: clinica.id,
          tipo_contato: 'paciente',
          nome_completo: `${randomItem(prenomes)} ${randomItem(nomes)} ${randomItem(nomes)}`,
          cpf: `${(100000000 + Math.floor(Math.random() * 899999999)).toString()}${(j % 99).toString().padStart(2, '0')}`,
          telefone: `(${(j % 89) + 11})9${(8000 + j).toString().padStart(4, '0')}-${(1000 + j).toString().padStart(4, '0')}`,
          email: `paciente${j}_${clinica.id.slice(-6)}@demo.com`,
          data_nascimento: randomDate(new Date(1950, 0, 1), new Date(2010, 11, 31)),
          cidade: clinica.cidade,
          estado: clinica.estado,
          status: 'ativo'
        });
      }

      // 3 MÉDICOS POR CLÍNICA
      for (let j = 1; j <= 3; j++) {
        medicos.push({
          clinica_id: clinica.id,
          nome_completo: `Dr(a) ${randomItem(prenomes)} ${randomItem(nomes)}`,
          cpf: `${(100000000 + Math.floor(Math.random() * 899999999)).toString()}${(j % 99).toString().padStart(2, '0')}`,
          crms: [
            { numero: `${10000 + j}`, estado: clinica.estado, especialidade: randomItem(['Clínica Geral', 'Cardiologia', 'Pediatria']) }
          ],
          email: `medico${j}_${clinica.id.slice(-6)}@demo.com`,
          telefone: `(${(j % 89) + 11})9${(7000 + j).toString().padStart(4, '0')}-${(1000 + j).toString().padStart(4, '0')}`,
          especialidades: [randomItem(['Clínica Geral', 'Cardiologia', 'Pediatria', 'Ortopedia'])],
          ativo: true
        });
      }

      // 5 PRODUTOS POR CLÍNICA
      const produtosClinica = ['Consulta', 'Exame de Sangue', 'Ultrassom', 'Raio-X', 'Vacina'];
      for (let j = 0; j < 5; j++) {
        produtos.push({
          clinica_id: clinica.id,
          nome: produtosClinica[j],
          tipo: j === 0 ? 'servico' : 'exame',
          preco_base: [80, 120, 200, 150, 50][j],
          custo: [30, 40, 80, 60, 20][j],
          quantidade_estoque: j > 0 ? Math.floor(Math.random() * 100) : 0,
          ativo: true
        });
      }

      // 8 AGENDAMENTOS POR CLÍNICA (últimos 30 dias)
      const hoje = new Date();
      for (let j = 0; j < 8; j++) {
        const diasAtras = Math.floor(Math.random() * 30);
        const dataAgendamento = new Date(hoje);
        dataAgendamento.setDate(dataAgendamento.getDate() - diasAtras);
        
        agendamentos.push({
          clinica_id: clinica.id,
          paciente_nome: `${randomItem(prenomes)} ${randomItem(nomes)}`,
          data: dataAgendamento.toISOString().split('T')[0],
          horario: `${8 + (j % 8)}:00`,
          tipo_consulta: j % 4 === 0 ? 'telemedicina' : 'presencial',
          medico: `Dr(a) ${randomItem(prenomes)} ${randomItem(nomes)}`,
          medico_crm: `${10000 + (j % 3)}`,
          especialidade: randomItem(['clinica_geral', 'medicina_integrativa']),
          status: ['agendado', 'confirmado', 'concluido'][j % 3],
          valor: [80, 120, 150][j % 3]
        });
      }

      // 5 PRONTUÁRIOS POR CLÍNICA
      for (let j = 0; j < 5; j++) {
        const diasAtras = Math.floor(Math.random() * 60);
        const dataProntuario = new Date(hoje);
        dataProntuario.setDate(dataProntuario.getDate() - diasAtras);
        
        prontuarios.push({
          clinica_id: clinica.id,
          paciente_nome: `${randomItem(prenomes)} ${randomItem(nomes)}`,
          paciente_id: 'demo_' + Math.random().toString(36).substr(2, 9),
          data_atendimento: dataProntuario.toISOString().split('T')[0],
          medico_nome: `Dr(a) ${randomItem(prenomes)} ${randomItem(nomes)}`,
          medico_crm: `${10000 + (j % 3)}`,
          tipo_atendimento: randomItem(['consulta', 'retorno', 'procedimento']),
          queixa_principal: randomItem(['Dor de cabeça', 'Febre', 'Dor abdominal', 'Tosse', 'Fadiga']),
          hipotese_diagnostica: randomItem(['J00 - Nasofaringite aguda', 'M54.5 - Dor lombar', 'R50.9 - Febre NE']),
          status_prontuario: randomItem(['rascunho', 'finalizado', 'assinado'])
        });
      }

      // 3 VENDAS POR CLÍNICA
      for (let j = 0; j < 3; j++) {
        const diasAtras = Math.floor(Math.random() * 30);
        const dataVenda = new Date(hoje);
        dataVenda.setDate(dataVenda.getDate() - diasAtras);
        
        vendas.push({
          clinica_id: clinica.id,
          paciente_nome: `${randomItem(prenomes)} ${randomItem(nomes)}`,
          data_venda: dataVenda.toISOString().split('T')[0],
          itens: [
            { produto: 'Consulta', quantidade: 1, preco_unitario: 80, subtotal: 80 }
          ],
          valor_total: 80,
          valor_final: 80,
          forma_pagamento: randomItem(['dinheiro', 'debito', 'credito', 'pix']),
          status_pagamento: randomItem(['pago', 'pendente']),
          vendedor_nome: admin.full_name
        });
      }
    }

    // BULK INSERT (2min total)
    console.log('Inserindo contatos...');
    await base44.asServiceRole.entities.Contato.bulkCreate(contatos);
    resultados.dados_criados.contatos = contatos.length;

    console.log('Inserindo médicos...');
    await base44.asServiceRole.entities.Medico.bulkCreate(medicos);
    resultados.dados_criados.medicos = medicos.length;

    console.log('Inserindo agendamentos...');
    await base44.asServiceRole.entities.Agendamento.bulkCreate(agendamentos);
    resultados.dados_criados.agendamentos = agendamentos.length;

    console.log('Inserindo prontuários...');
    await base44.asServiceRole.entities.Prontuario.bulkCreate(prontuarios);
    resultados.dados_criados.prontuarios = prontuarios.length;

    console.log('Inserindo produtos...');
    await base44.asServiceRole.entities.Produto.bulkCreate(produtos);
    resultados.dados_criados.produtos = produtos.length;

    console.log('Inserindo vendas...');
    await base44.asServiceRole.entities.Venda.bulkCreate(vendas);
    resultados.dados_criados.vendas = vendas.length;

    resultados.tempo_execucao = `${((Date.now() - inicio) / 1000).toFixed(2)}s`;
    resultados.performance = `${numClinicas} clínicas + ${contatos.length + agendamentos.length + prontuarios.length} registros em ${resultados.tempo_execucao}`;

    return Response.json({
      success: true,
      ...resultados,
      mensagem: `✅ ${numClinicas} clínicas demo criadas com sucesso`
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});