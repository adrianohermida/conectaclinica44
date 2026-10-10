import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CRÍTICO: Compra número Twilio e configura WhatsApp
 * Input: { clinica_id, country_code = 'BR', area_code = '11' }
 * Output: { success, phone_number, webhook_url }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admin pode configurar WhatsApp' }, { status: 403 });
    }

    const { clinica_id, country_code = 'BR', area_code = '11' } = await req.json();

    if (!clinica_id) {
      return Response.json({ error: 'clinica_id obrigatório' }, { status: 400 });
    }

    // Verificar se já existe configuração
    const configsExistentes = await base44.asServiceRole.entities.ConfiguracaoWhatsApp.filter({ 
      clinica_id 
    });

    if (configsExistentes.length > 0) {
      return Response.json({ 
        error: 'WhatsApp já configurado para esta clínica',
        config: configsExistentes[0]
      }, { status: 409 });
    }

    // 1. Credenciais Twilio (global - SuperAdmin)
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return Response.json({ 
        error: 'Credenciais Twilio não configuradas no SuperAdmin' 
      }, { status: 500 });
    }

    // 2. Buscar números disponíveis
    const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/${country_code}/Local.json?AreaCode=${area_code}&SmsEnabled=true&MmsEnabled=true&VoiceEnabled=false`;

    const authHeader = 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const searchResponse = await fetch(searchUrl, {
      headers: { 'Authorization': authHeader }
    });

    if (!searchResponse.ok) {
      const error = await searchResponse.text();
      throw new Error(`Twilio search error: ${error}`);
    }

    const availableNumbers = await searchResponse.json();

    if (availableNumbers.available_phone_numbers.length === 0) {
      return Response.json({ 
        error: `Nenhum número disponível para área ${area_code}` 
      }, { status: 404 });
    }

    const numeroEscolhido = availableNumbers.available_phone_numbers[0].phone_number;

    // 3. Comprar número
    const webhookUrl = `https://${req.headers.get('host')}/functions/receberWhatsAppWebhook`;
    
    const buyUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`;
    
    const buyResponse = await fetch(buyUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        PhoneNumber: numeroEscolhido,
        SmsUrl: webhookUrl,
        SmsMethod: 'POST'
      })
    });

    if (!buyResponse.ok) {
      const error = await buyResponse.text();
      throw new Error(`Twilio buy error: ${error}`);
    }

    const purchasedNumber = await buyResponse.json();

    // 4. Salvar configuração
    const config = await base44.asServiceRole.entities.ConfiguracaoWhatsApp.create({
      clinica_id,
      twilio_phone_number: numeroEscolhido,
      twilio_account_sid: TWILIO_ACCOUNT_SID,
      twilio_auth_token_encrypted: TWILIO_AUTH_TOKEN, // TODO: Criptografar
      twilio_phone_sid: purchasedNumber.sid,
      webhook_url: webhookUrl,
      ativo: true,
      custo_mensal_twilio_usd: 1.15, // $1.15/mês número BR
      mensagem_boas_vindas: `Olá! 👋 Bem-vindo ao WhatsApp da clínica. Como posso ajudar?`
    });

    // 5. Auditoria
    await base44.asServiceRole.entities.LogAuditoria.create({
      clinica_id,
      user_id: user.id,
      acao: 'whatsapp_configurado',
      detalhes: `Número comprado: ${numeroEscolhido}, SID: ${purchasedNumber.sid}`,
      categoria: 'integracao_critica'
    });

    console.log(`[WhatsApp] ✅ Configurado - Clínica: ${clinica_id}, Número: ${numeroEscolhido}`);

    return Response.json({ 
      success: true,
      phone_number: numeroEscolhido,
      webhook_url: webhookUrl,
      config
    });

  } catch (error) {
    console.error('[WhatsApp] Erro configuração:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});