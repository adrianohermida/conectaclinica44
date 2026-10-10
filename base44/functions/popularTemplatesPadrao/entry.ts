import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const TEMPLATES_PADRAO = {
  termos_uso: {
    tipo_documento: 'termos_uso',
    categoria_custom: 'Termos de Serviço',
    uso_tipo: 'publico',
    slug: 'termos-uso',
    titulo_custom: 'Termos de Uso do ConectaClínica',
    versao: '1.0.0',
    ativo: true,
    template_padrao: true,
    blocos: [
      {
        id: 'bloco_1',
        ordem: 0,
        tipo: 'secao',
        titulo: '1. Aceitação dos Termos',
        conteudo_html: '<p>Ao acessar e usar a plataforma ConectaClínica, você concorda em cumprir estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não utilize nossos serviços.</p>',
        expansivel: true,
        visivel: true
      },
      {
        id: 'bloco_2',
        ordem: 1,
        tipo: 'secao',
        titulo: '2. Descrição do Serviço',
        conteudo_html: '<p>O ConectaClínica é uma plataforma SaaS de gestão clínica que oferece ferramentas para agendamento, prontuários eletrônicos, gestão financeira e comunicação com pacientes, desenvolvida em conformidade com a legislação vigente.</p>',
        expansivel: true,
        visivel: true
      },
      {
        id: 'bloco_3',
        ordem: 2,
        tipo: 'secao',
        titulo: '3. Cadastro e Conta',
        conteudo_html: '<p>Para utilizar nossos serviços, você deve criar uma conta fornecendo informações precisas e completas. Você é responsável por manter a confidencialidade das suas credenciais de acesso.</p>',
        expansivel: true,
        visivel: true
      },
      {
        id: 'bloco_4',
        ordem: 3,
        tipo: 'secao',
        titulo: '4. Uso Aceitável',
        conteudo_html: '<p>Você concorda em usar a plataforma apenas para fins legais e em conformidade com todas as leis aplicáveis, incluindo o Código de Ética Médica e demais regulamentações do setor de saúde.</p>',
        expansivel: true,
        visivel: true
      },
      {
        id: 'bloco_5',
        ordem: 4,
        tipo: 'secao',
        titulo: '5. Propriedade Intelectual',
        conteudo_html: '<p>Todos os direitos de propriedade intelectual relacionados à plataforma ConectaClínica são de propriedade exclusiva da AetherLab. É proibida a reprodução, modificação ou distribuição não autorizada.</p>',
        expansivel: true,
        visivel: true
      },
      {
        id: 'bloco_6',
        ordem: 5,
        tipo: 'secao',
        titulo: '6. Limitação de Responsabilidade',
        conteudo_html: '<p>A plataforma é fornecida "como está". Não nos responsabilizamos por danos indiretos, incidentais ou consequenciais resultantes do uso ou da impossibilidade de uso da plataforma.</p>',
        expansivel: true,
        visivel: true
      },
      {
        id: 'bloco_7',
        ordem: 6,
        tipo: 'secao',
        titulo: '7. Modificações',
        conteudo_html: '<p>Reservamo-nos o direito de modificar estes Termos de Uso a qualquer momento. Notificaremos os usuários sobre alterações significativas através da plataforma ou por e-mail.</p>',
        expansivel: true,
        visivel: true
      }
    ]
  },
  politica_privacidade: {
    tipo_documento: 'politica_privacidade',
    categoria_custom: 'Política de Privacidade',
    uso_tipo: 'publico',
    slug: 'politica-privacidade',
    titulo_custom: 'Política de Privacidade do ConectaClínica',
    versao: '1.0.0',
    ativo: true,
    template_padrao: true,
    blocos: [
      {
        id: 'bloco_1',
        ordem: 0,
        tipo: 'secao',
        titulo: '1. Introdução',
        conteudo_html: '<p>Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).</p>',
        expansivel: true,
        visivel: true
      },
      {
        id: 'bloco_2',
        ordem: 1,
        tipo: 'secao',
        titulo: '2. Dados Coletados',
        conteudo_html: '<p>Coletamos as seguintes categorias de dados:</p><ul><li>Dados cadastrais (nome, e-mail, telefone, CPF/CNPJ)</li><li>Dados de saúde (prontuários, histórico médico) - processados conforme LGPD</li><li>Dados de pagamento (processados por terceiros seguros)</li><li>Dados de uso da plataforma (logs, analytics)</li></ul>',
        expansivel: true,
        visivel: true
      },
      {
        id: 'bloco_3',
        ordem: 2,
        tipo: 'secao',
        titulo: '3. Finalidade do Tratamento',
        conteudo_html: '<p>Utilizamos seus dados para:</p><ul><li>Prestar os serviços contratados</li><li>Melhorar a experiência do usuário</li><li>Cumprir obrigações legais</li><li>Realizar análises estatísticas e de performance</li></ul>',
        expansivel: true,
        visivel: true
      },
      {
        id: 'bloco_4',
        ordem: 3,
        tipo: 'secao',
        titulo: '4. Compartilhamento de Dados',
        conteudo_html: '<p>Não vendemos seus dados pessoais. Compartilhamos dados apenas quando:</p><ul><li>Necessário para prestação do serviço (processadores de pagamento, serviços de nuvem)</li><li>Exigido por lei ou ordem judicial</li><li>Com seu consentimento explícito</li></ul>',
        expansivel: true,
        visivel: true
      },
      {
        id: 'bloco_5',
        ordem: 4,
        tipo: 'secao',
        titulo: '5. Segurança',
        conteudo_html: '<p>Implementamos medidas técnicas e organizacionais para proteger seus dados, incluindo criptografia, controle de acesso, backups regulares e monitoramento contínuo de segurança.</p>',
        expansivel: true,
        visivel: true
      },
      {
        id: 'bloco_6',
        ordem: 5,
        tipo: 'secao',
        titulo: '6. Seus Direitos',
        conteudo_html: '<p>De acordo com a LGPD, você tem direito a:</p><ul><li>Acessar seus dados</li><li>Corrigir dados incompletos ou incorretos</li><li>Solicitar a exclusão de dados</li><li>Revogar consentimento</li><li>Portabilidade de dados</li></ul>',
        expansivel: true,
        visivel: true
      },
      {
        id: 'bloco_7',
        ordem: 6,
        tipo: 'secao',
        titulo: '7. Contato',
        conteudo_html: '<p>Para exercer seus direitos ou esclarecer dúvidas sobre privacidade, entre em contato com nosso DPO através do e-mail: contato@aetherlab.com.br</p>',
        expansivel: true,
        visivel: true
      }
    ]
  },
  lgpd: {
    tipo_documento: 'lgpd',
    categoria_custom: 'Compliance LGPD',
    uso_tipo: 'publico',
    slug: 'compliance-lgpd',
    titulo_custom: 'Conformidade com a LGPD',
    versao: '1.0.0',
    ativo: true,
    template_padrao: true,
    blocos: [
      {
        id: 'bloco_1',
        ordem: 0,
        tipo: 'secao',
        titulo: '1. Compromisso com a LGPD',
        conteudo_html: '<p>O ConectaClínica está comprometido com a conformidade total com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018), garantindo a privacidade e segurança dos dados pessoais de todos os usuários.</p>',
        expansivel: true,
        visivel: true
      },
      {
        id: 'bloco_2',
        ordem: 1,
        tipo: 'secao',
        titulo: '2. Base Legal',
        conteudo_html: '<p>O tratamento de dados no ConectaClínica baseia-se nas seguintes bases legais:</p><ul><li>Execução de contrato (Art. 7º, V)</li><li>Legítimo interesse (Art. 7º, IX)</li><li>Cumprimento de obrigação legal (Art. 7º, II)</li><li>Tutela da saúde (Art. 11, II) - para dados sensíveis de saúde</li></ul>',
        expansivel: true,
        visivel: true
      },
      {
        id: 'bloco_3',
        ordem: 2,
        tipo: 'secao',
        titulo: '3. Princípios Aplicados',
        conteudo_html: '<p>Seguimos rigorosamente os princípios da LGPD:</p><ul><li><strong>Finalidade:</strong> Dados coletados para propósitos específicos</li><li><strong>Adequação:</strong> Tratamento compatível com a finalidade</li><li><strong>Necessidade:</strong> Coleta mínima de dados necessários</li><li><strong>Transparência:</strong> Informações claras sobre o tratamento</li><li><strong>Segurança:</strong> Medidas técnicas robustas</li></ul>',
        expansivel: true,
        visivel: true
      },
      {
        id: 'bloco_4',
        ordem: 3,
        tipo: 'secao',
        titulo: '4. Encarregado de Dados (DPO)',
        conteudo_html: '<p>Nosso Encarregado de Proteção de Dados está disponível para:</p><ul><li>Receber e atender solicitações dos titulares</li><li>Prestar esclarecimentos sobre tratamento de dados</li><li>Interagir com a ANPD quando necessário</li></ul><p>Contato: contato@aetherlab.com.br</p>',
        expansivel: true,
        visivel: true
      },
      {
        id: 'bloco_5',
        ordem: 4,
        tipo: 'secao',
        titulo: '5. Medidas de Segurança',
        conteudo_html: '<p>Implementamos:</p><ul><li>Criptografia end-to-end</li><li>Controle de acesso baseado em funções (RBAC)</li><li>Logs de auditoria</li><li>Backups regulares com retenção adequada</li><li>Testes de segurança periódicos</li><li>Plano de resposta a incidentes</li></ul>',
        expansivel: true,
        visivel: true
      },
      {
        id: 'bloco_6',
        ordem: 5,
        tipo: 'secao',
        titulo: '6. Relatório de Impacto (DPIA)',
        conteudo_html: '<p>Realizamos Avaliações de Impacto à Proteção de Dados (DPIA) para atividades de alto risco, documentando e mitigando potenciais riscos aos direitos e liberdades dos titulares.</p>',
        expansivel: true,
        visivel: true
      },
      {
        id: 'bloco_7',
        ordem: 6,
        tipo: 'secao',
        titulo: '7. Transparência e Prestação de Contas',
        conteudo_html: '<p>Mantemos registros detalhados de todas as operações de tratamento de dados (ROPA - Record of Processing Activities) e estamos preparados para demonstrar conformidade à ANPD quando solicitado.</p>',
        expansivel: true,
        visivel: true
      }
    ]
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tipo } = await req.json().catch(() => ({}));

    // Se tipo específico, popular apenas ele
    const tiposPopular = tipo ? [tipo] : Object.keys(TEMPLATES_PADRAO);

    const resultados = [];
    for (const tipoDoc of tiposPopular) {
      const template = TEMPLATES_PADRAO[tipoDoc];
      if (!template) continue;

      // Verificar se já existe
      const existentes = await base44.asServiceRole.entities.ConteudoLegal.filter({
        tipo_documento: tipoDoc,
        template_padrao: true
      });

      if (existentes.length === 0) {
        const criado = await base44.asServiceRole.entities.ConteudoLegal.create({
          ...template,
          metadata: {
            autor_id: user.id,
            autor_nome: user.full_name,
            data_criacao: new Date().toISOString(),
            data_publicacao: new Date().toISOString(),
            changelog: [{
              versao: '1.0.0',
              data: new Date().toISOString(),
              mudancas: 'Template padrão inicial'
            }]
          },
          integracao_esign: {
            requer_assinatura: false,
            tipo_aceite: 'checkbox'
          }
        });
        resultados.push({ tipo: tipoDoc, status: 'criado', id: criado.id });
      } else {
        resultados.push({ tipo: tipoDoc, status: 'já_existe', id: existentes[0].id });
      }
    }

    return Response.json({ 
      success: true, 
      resultados,
      message: 'Templates padrão populados com sucesso'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});