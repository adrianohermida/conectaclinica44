import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * DIAGNÓSTICO BRUTAL: Por que email não chega?
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');

    console.log('═════════════════════════════════════');
    console.log('🔍 DIAGNÓSTICO RECEBIMENTO EMAIL');
    console.log('═════════════════════════════════════\n');

    // 1. MX RECORDS
    console.log('1️⃣ MX RECORDS (conectaclinica.com.br):');
    const mxRes = await fetch('https://dns.google/resolve?name=conectaclinica.com.br&type=MX');
    const mxData = await mxRes.json();
    
    let mxRecordsOk = false;
    if (mxData.Answer) {
      mxData.Answer.forEach(mx => {
        const aponta = mx.data?.includes('sendgrid.net');
        if (aponta) mxRecordsOk = true;
        console.log(`   ${aponta ? '✅' : '❌'} ${mx.data}`);
      });
    } else {
      console.log('   ❌ NENHUM MX RECORD ENCONTRADO');
    }

    // 2. SENDGRID INBOUND PARSE
    console.log('\n2️⃣ SENDGRID INBOUND PARSE:');
    const inboundRes = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
      headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` }
    });

    let inboundData = { result: [] };
    let inboundParseApiOk = inboundRes.ok;

    if (inboundRes.ok) {
      inboundData = await inboundRes.json();
      
      if (inboundData.result?.length > 0) {
        inboundData.result.forEach(parse => {
          console.log(`   Hostname: ${parse.hostname}`);
          console.log(`   URL: ${parse.url}`);
          console.log(`   Spam Check: ${parse.spam_check ? '✅' : '❌'}`);
          
          if (parse.hostname === 'conectaclinica.com.br') {
            console.log('   ✅ Hostname correto!');
          } else if (parse.hostname === 'mail.conectaclinica.com.br') {
            console.log('   ⚠️  Hostname "mail." ainda presente - REMOVER');
          }
        });
      } else {
        console.log('   ❌ NENHUM INBOUND PARSE CONFIGURADO');
      }
    } else {
      console.log('   ❌ FALHA AO OBTER CONFIGURAÇÕES');
    }

    // 3. CONFIGS EMAIL
    console.log('\n3️⃣ CONFIGURAÇÕES EMAIL:');
    const configs = await base44.asServiceRole.entities.ConfiguracaoEmail.filter({ ativo: true });
    
    configs.forEach(config => {
      console.log(`   📧 ${config.alias_recebimento}`);
      console.log(`      Clínica: ${config.clinica_id?.substring(0, 8)}`);
      console.log(`      Inbound Parse: ${config.inbound_parse_configurado ? '✅' : '❌'}`);
    });

    // 4. ÚLTIMOS EMAILS RECEBIDOS
    console.log('\n4️⃣ ÚLTIMOS EMAILS RECEBIDOS:');
    const emails = await base44.asServiceRole.entities.EmailRecebido.list('-created_date', 5);
    
    if (emails.length > 0) {
      emails.forEach(email => {
        console.log(`   📬 ${email.from_email} → ${email.to_email}`);
        console.log(`      Processado: ${email.processed ? '✅' : '❌'}`);
        console.log(`      Data: ${email.created_date}`);
      });
    } else {
      console.log('   ❌ NENHUM EMAIL RECEBIDO');
    }

    // 5. VEREDICTO
    console.log('\n═════════════════════════════════════');
    console.log('📋 VEREDICTO:');
    
    const inboundHostnameCorrect = inboundData.result?.some(p => p.hostname === 'conectaclinica.com.br');
    const inboundHostnameMailPresent = inboundData.result?.some(p => p.hostname === 'mail.conectaclinica.com.br');
    
    if (!mxRecordsOk) {
      console.log('❌ MX não aponta para SendGrid');
      console.log('   → Configurar: conectaclinica.com.br MX 10 mx.sendgrid.net');
    }
    
    if (!inboundParseApiOk) {
      console.log('❌ Inbound Parse não configurado');
    }
    
    if (inboundParseApiOk && !inboundHostnameCorrect) {
      console.log('❌ PROBLEMA CRÍTICO: hostname "conectaclinica.com.br" NÃO ENCONTRADO');
      console.log('   → Ação: Adicionar Inbound Parse para "conectaclinica.com.br"');
    }
    
    if (inboundHostnameMailPresent) {
      console.log('⚠️  ATENÇÃO: hostname "mail.conectaclinica.com.br" ainda presente');
      console.log('   → Ação: REMOVER para evitar conflitos');
    }
    
    if (mxRecordsOk && inboundParseApiOk && inboundHostnameCorrect && !inboundHostnameMailPresent) {
      console.log('✅ TUDO CONFIGURADO CORRETAMENTE');
      console.log('   Teste: envie email para prevenclin@conectaclinica.com.br');
    }
    
    console.log('═════════════════════════════════════\n');

    return Response.json({
      mx_records_ok: mxRecordsOk,
      inbound_parse_ok: inboundParseApiOk,
      hostname_correto: inboundHostnameCorrect,
      hostname_mail_presente: inboundHostnameMailPresent,
      configs_ativas: configs.length,
      emails_recebidos: emails.length,
      veredito: mxRecordsOk && inboundHostnameCorrect && !inboundHostnameMailPresent ? 
        'Configuração correta. Teste enviando email.' : 
        'Problemas detectados. Siga ações recomendadas.'
    });

  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});