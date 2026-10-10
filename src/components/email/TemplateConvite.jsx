/**
 * Template HTML para email de convite
 * Usado por enviarConviteUsuario function
 */
export function gerarTemplateConvite({ clinicaNome, perfilNome, linkConvite }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F4F7FA;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    <tr>
      <td style="background: linear-gradient(135deg, #7E57FF 0%, #6d28d9 100%); padding: 40px 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Você foi convidado!</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 16px; color: #202124; margin: 0 0 20px;">Olá,</p>
        <p style="font-size: 16px; color: #202124; margin: 0 0 20px;">
          Você foi convidado(a) para fazer parte da equipe de <strong>${clinicaNome}</strong> no ConectaClínica.
        </p>
        <div style="background: #f5f3ff; border-left: 4px solid #7E57FF; padding: 16px; margin: 24px 0; border-radius: 8px;">
          <p style="margin: 0; color: #5f6368; font-size: 14px;"><strong>Perfil atribuído:</strong> ${perfilNome}</p>
        </div>
        <p style="font-size: 16px; color: #202124; margin: 0 0 30px;">
          Clique no botão abaixo para aceitar o convite e começar a trabalhar:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${linkConvite}" style="background: #7E57FF; color: white; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(126, 87, 255, 0.3);">
            Aceitar Convite
          </a>
        </div>
        <p style="font-size: 14px; color: #80868b; margin: 30px 0 0; padding-top: 20px; border-top: 1px solid #e8eaed;">
          Ou copie e cole este link no navegador:<br>
          <a href="${linkConvite}" style="color: #7E57FF; word-break: break-all; text-decoration: none;">${linkConvite}</a>
        </p>
        <div style="background: #fef9e5; border: 1px solid #fbd54f; padding: 16px; margin: 24px 0; border-radius: 8px;">
          <p style="margin: 0; color: #956802; font-size: 13px;">
            ⏰ <strong>Atenção:</strong> Este convite expira em <strong>24 horas</strong>.
          </p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background: #F4F7FA; padding: 30px; text-align: center; border-top: 1px solid #e8eaed;">
        <p style="margin: 0; color: #80868b; font-size: 13px;">
          ConectaClínica - Gestão Inteligente de Clínicas<br>
          <a href="https://conectaclinica.com.br" style="color: #7E57FF; text-decoration: none;">conectaclinica.com.br</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}