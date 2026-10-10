import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prescricao_id } = await req.json();

    if (!prescricao_id) {
      return Response.json({ error: 'prescricao_id obrigatório' }, { status: 400 });
    }

    // Buscar prescrição com isolamento multi-tenant
    const prescricoes = await base44.entities.PrescricaoEletronica.filter({
      id: prescricao_id,
      clinica_id: user.clinica_id
    });

    if (!prescricoes || prescricoes.length === 0) {
      return Response.json({ error: 'Prescrição não encontrada' }, { status: 404 });
    }

    const prescricao = prescricoes[0];

    // VALIDAÇÃO CFM CRÍTICA
    if (!prescricao.medico_crm || !prescricao.prontuario_id) {
      return Response.json({ 
        error: 'Prescrição inválida: CRM ou prontuário ausente (CFM 1.821/07)' 
      }, { status: 400 });
    }

    // Gerar PDF CFM-compliant
    const doc = new jsPDF();
    let y = 20;

    // ========== CABEÇALHO CFM (OBRIGATÓRIO) ==========
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('PRESCRIÇÃO MÉDICA', 105, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100);
    doc.text(`Data: ${new Date(prescricao.data_prescricao).toLocaleDateString('pt-BR')}`, 105, y, { align: 'center' });
    y += 10;

    // Separador
    doc.setDrawColor(200);
    doc.line(20, y, 190, y);
    y += 10;

    // Dados do médico (CFM Art. 16)
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0);
    doc.text('MÉDICO:', 20, y);
    doc.setFont(undefined, 'normal');
    doc.text(prescricao.medico_nome || 'Não informado', 50, y);
    y += 7;

    doc.setFont(undefined, 'bold');
    doc.text('CRM:', 20, y);
    doc.setFont(undefined, 'normal');
    doc.text(prescricao.medico_crm, 50, y);
    y += 10;

    // Dados do paciente
    doc.setFont(undefined, 'bold');
    doc.text('PACIENTE:', 20, y);
    doc.setFont(undefined, 'normal');
    doc.text(prescricao.paciente_nome || 'Não informado', 50, y);
    y += 7;

    if (prescricao.paciente_cpf) {
      doc.setFont(undefined, 'bold');
      doc.text('CPF:', 20, y);
      doc.setFont(undefined, 'normal');
      doc.text(prescricao.paciente_cpf, 50, y);
      y += 7;
    }

    // Prontuário (CFM obrigatório)
    doc.setFont(undefined, 'bold');
    doc.text('PRONTUÁRIO:', 20, y);
    doc.setFont(undefined, 'normal');
    doc.text(`#${prescricao.prontuario_id.slice(0, 8).toUpperCase()}`, 50, y);
    y += 10;

    // Tipo de receita
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Tipo: ${prescricao.tipo_receita.toUpperCase().replace('_', ' ')}`, 20, y);
    y += 10;

    // Separador
    doc.setDrawColor(200);
    doc.line(20, y, 190, y);
    y += 10;

    // ========== MEDICAMENTOS ==========
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0);
    doc.text('MEDICAMENTOS PRESCRITOS:', 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    prescricao.medicamentos.forEach((med, index) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      // Número do medicamento
      doc.setFont(undefined, 'bold');
      doc.text(`${index + 1}.`, 20, y);
      
      // Nome genérico (obrigatório CFM)
      doc.setFont(undefined, 'bold');
      doc.text(med.nome_generico.toUpperCase(), 25, y);
      y += 6;

      // Nome comercial (se houver)
      if (med.nome_comercial) {
        doc.setFont(undefined, 'normal');
        doc.setTextColor(80);
        doc.text(`   (${med.nome_comercial})`, 25, y);
        y += 6;
      }

      doc.setTextColor(0);
      doc.setFont(undefined, 'normal');

      // Posologia
      const posologia = `   ${med.dose} ${med.unidade} - ${med.via_administracao} - ${med.frequencia}`;
      doc.text(posologia, 25, y);
      y += 6;

      // Duração e quantidade
      if (med.duracao || med.quantidade_total) {
        const detalhes = [];
        if (med.duracao) detalhes.push(`Duração: ${med.duracao}`);
        if (med.quantidade_total) detalhes.push(`Quantidade: ${med.quantidade_total}`);
        doc.text(`   ${detalhes.join(' | ')}`, 25, y);
        y += 6;
      }

      // Orientações
      if (med.orientacoes) {
        doc.setTextColor(60);
        const lines = doc.splitTextToSize(`   Orientações: ${med.orientacoes}`, 160);
        lines.forEach(line => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, 25, y);
          y += 5;
        });
        doc.setTextColor(0);
      }

      // Uso contínuo
      if (med.uso_continuo) {
        doc.setFont(undefined, 'bold');
        doc.text('   ⚠️ USO CONTÍNUO', 25, y);
        doc.setFont(undefined, 'normal');
        y += 6;
      }

      y += 5; // Espaço entre medicamentos
    });

    // Orientações gerais
    if (prescricao.orientacoes_gerais) {
      y += 5;
      doc.setFont(undefined, 'bold');
      doc.text('ORIENTAÇÕES GERAIS:', 20, y);
      y += 6;
      doc.setFont(undefined, 'normal');
      const lines = doc.splitTextToSize(prescricao.orientacoes_gerais, 170);
      lines.forEach(line => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += 5;
      });
    }

    // ========== RODAPÉ CFM (OBRIGATÓRIO) ==========
    const finalY = 270;
    doc.setDrawColor(200);
    doc.line(20, finalY, 190, finalY);
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Prescrição eletrônica em conformidade com CFM 1.821/07', 105, finalY + 5, { align: 'center' });
    doc.text(`Documento gerado em ${new Date().toLocaleString('pt-BR')}`, 105, finalY + 10, { align: 'center' });
    
    // Assinatura digital (se houver)
    if (prescricao.assinatura_digital?.status === 'assinado') {
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 128, 0);
      doc.text('✓ DOCUMENTO ASSINADO DIGITALMENTE', 105, finalY + 17, { align: 'center' });
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.text(`Data: ${new Date(prescricao.assinatura_digital.assinado_em).toLocaleString('pt-BR')}`, 105, finalY + 22, { align: 'center' });
    } else {
      doc.setTextColor(200, 0, 0);
      doc.text('⚠️ AGUARDANDO ASSINATURA DIGITAL', 105, finalY + 17, { align: 'center' });
    }

    // Hash de integridade (CFM)
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Hash SHA-256: ${prescricao.hash_sha256 || 'N/A'}`, 105, finalY + 27, { align: 'center' });

    // Gerar PDF como ArrayBuffer
    const pdfBytes = doc.output('arraybuffer');
    const blob = new Uint8Array(pdfBytes);

    // Upload para storage Base44
    const formData = new FormData();
    formData.append('file', new Blob([blob], { type: 'application/pdf' }), `prescricao_${prescricao.id}.pdf`);

    const uploadResponse = await base44.integrations.Core.UploadFile({ 
      file: new Blob([blob], { type: 'application/pdf' })
    });

    const pdf_url = uploadResponse.file_url;

    // Atualizar prescrição com URL do PDF
    await base44.entities.PrescricaoEletronica.update(prescricao.id, {
      pdf_url,
      status: 'assinada' // Pronta para assinatura
    });

    return Response.json({ 
      success: true, 
      pdf_url,
      prescricao_id: prescricao.id,
      message: 'PDF CFM-compliant gerado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});