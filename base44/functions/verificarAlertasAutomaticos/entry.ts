import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Buscar todas as configurações ativas
    const configs = await base44.asServiceRole.entities.ConfiguracaoNotificacao.filter({ ativo: true });
    
    if (configs.length === 0) {
      return Response.json({
        success: true,
        message: 'Nenhuma configuração de notificação ativa'
      });
    }

    const hoje = new Date();
    const alertasEnviados = [];

    // 1. Verificar certidões vencendo
    const certidoes = await base44.asServiceRole.entities.CertidaoRegularidade.list();
    
    for (const cert of certidoes) {
      const dataValidade = new Date(cert.data_validade);
      const diasRestantes = Math.floor((dataValidade - hoje) / (1000 * 60 * 60 * 24));
      
      const configsInteressadas = configs.filter(c => 
        c.notificar_certidoes_vencendo && 
        diasRestantes <= c.dias_antecedencia_certidao &&
        diasRestantes >= 0
      );

      if (configsInteressadas.length > 0) {
        const destinatarios = configsInteressadas.map(c => c.usuario_email);
        
        await base44.asServiceRole.functions.invoke('enviarNotificacao', {
          tipo: 'certidao_vencendo',
          dados: {
            titulo: cert.titulo,
            orgao: cert.orgao_emissor,
            data_validade: dataValidade.toLocaleDateString('pt-BR'),
            dias_restantes: diasRestantes
          },
          destinatarios
        });

        alertasEnviados.push(`Certidão vencendo: ${cert.titulo}`);
      }
    }

    // 2. Verificar estoque baixo
    const medicamentos = await base44.asServiceRole.entities.Medicamento.list();
    const estoquesBaixos = medicamentos.filter(m => m.quantidade_estoque <= (m.estoque_minimo || 0));

    if (estoquesBaixos.length > 0) {
      const configsEstoque = configs.filter(c => c.notificar_estoque_baixo);
      
      if (configsEstoque.length > 0) {
        await base44.asServiceRole.functions.invoke('enviarNotificacao', {
          tipo: 'estoque_baixo',
          dados: {
            quantidade: estoquesBaixos.length,
            medicamentos: estoquesBaixos.slice(0, 5).map(m => ({
              nome: m.nome,
              quantidade: m.quantidade_estoque,
              minimo: m.estoque_minimo
            }))
          },
          destinatarios: configsEstoque.map(c => c.usuario_email)
        });

        alertasEnviados.push(`Estoque baixo: ${estoquesBaixos.length} itens`);
      }
    }

    // 3. Verificar obrigações fiscais
    const obrigacoes = await base44.asServiceRole.entities.ObrigacaoFiscal.filter({ ativo: true });
    const diaAtual = hoje.getDate();
    
    for (const obr of obrigacoes) {
      if (obr.periodicidade === 'mensal' && obr.dia_vencimento) {
        const diasAteVencimento = obr.dia_vencimento - diaAtual;
        
        if (diasAteVencimento >= 0 && diasAteVencimento <= 5) {
          const configsFiscal = configs.filter(c => c.notificar_prazos_fiscais);
          
          if (configsFiscal.length > 0) {
            await base44.asServiceRole.functions.invoke('enviarNotificacao', {
              tipo: 'prazo_fiscal',
              dados: {
                nome: obr.nome,
                tipo: obr.tipo,
                vencimento: `Dia ${obr.dia_vencimento}`,
                dias_restantes: diasAteVencimento
              },
              destinatarios: configsFiscal.map(c => c.usuario_email)
            });

            alertasEnviados.push(`Obrigação fiscal: ${obr.nome}`);
          }
        }
      }
    }

    return Response.json({
      success: true,
      alertas_enviados: alertasEnviados.length,
      detalhes: alertasEnviados
    });

  } catch (error) {
    console.error('Erro ao verificar alertas:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});