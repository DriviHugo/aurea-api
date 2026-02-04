export interface MailTemplate {
  html: string;
  to: string;
  from: string;
  subject: string;
}

export function verifyMailTemplate(
  name: string,
  email: string,
  token: string,
): MailTemplate {
  const url = `${process.env["APP_BASE_ENDPOINT"]}/api/private/auth/register/validate?token=${token}`;
  return {
    html: `
  <p>Hola ${name || email},</p>
  <p>Gracias por registrarte en <b>${process.env["COMPANY_NAME"]}</b>.</p>
  <p>Para activar tu cuenta, por favor verifica tu dirección de correo electrónico haciendo clic en el siguiente botón:</p>
  <p>
    <a href="${url}" style="
      display: inline-block;
      padding: 12px 24px;
      background-color: #2563eb;
      color: #fff;
      text-decoration: none;
      border-radius: 4px;
      font-weight: bold;
      font-size: 16px;
    ">
      Verificar correo electrónico
    </a>
  </p>
  <p>O copia y pega este enlace en tu navegador:</p>
  <p style="word-break: break-all;"><a href="${url}">${url}</a></p>
  <p>Si no has solicitado esta cuenta, puedes ignorar este mensaje.</p>
  <p>Un saludo,<br>El equipo de ${process.env["COMPANY_NAME"]}</p>
`,
    to: email,
    from: process.env["EMAIL_FROM"] ?? "no-reply@1millionbot.com",
    subject: "Email verification",
  };
}

export function requestNewPasswordTemplate(
  name: string,
  email: string,
  token: string,
): MailTemplate {
  const url = `${process.env["FRONTEND_BASE_URL"]}/reset-password?token=${token}`;

  return {
    html: `
      <p>Hola ${name || email},</p>
      <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <b>${process.env["COMPANY_NAME"]}</b>.</p>
      <p>Si has solicitado este cambio, haz clic en el siguiente botón para crear una nueva contraseña:</p>
      <p>
        <a href="${url}" style="
          display: inline-block;
          padding: 12px 24px;
          background-color: #2563eb;
          color: #fff;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
          font-size: 16px;
        ">
          Restablecer contraseña
        </a>
      </p>
      <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
      <p style="word-break: break-all;"><a href="${url}">${url}</a></p>
      <p>Si no has solicitado el restablecimiento de contraseña, puedes ignorar este mensaje. Tu contraseña actual seguirá siendo válida.</p>
      <p>Gracias,<br>El equipo de ${process.env["COMPANY_NAME"]}</p>
    `,
    to: email,
    from: process.env["EMAIL_FROM"] ?? "no-reply@1millionbot.com",
    subject: "Restablecer contraseña",
  };
}
