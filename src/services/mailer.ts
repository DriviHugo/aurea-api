import nodemailer, { type Transporter, type SendMailOptions } from "nodemailer";
type Attachment = NonNullable<SendMailOptions["attachments"]>[number];

let transporter: Transporter;
if (process.env["NODE_ENV"] === "production") {
  transporter = nodemailer.createTransport({
    auth: {
      pass: process.env["EMAIL_AUTH_PASS"],
      user: process.env["EMAIL_AUTH_USER"],
    },
    service: "gmail",
  });
} else {
  transporter = nodemailer.createTransport({
    host: process.env["EMAIL_HOST"] ?? "localhost",
    port: Number(process.env["EMAIL_PORT"] ?? 1025),
    secure: false, // true for 465, false for other ports
  });
}

export async function sendEmail(
  {
    to,
    subject,
    html,
    from = process.env["EMAIL_FROM"] ?? "no-reply@example.com",
    attachments = null,
  }: {
    to: string;
    subject: string;
    html: string;
    from?: string;
    attachments?: Attachment[] | null;
  },
  errorCallback?: (error: Error) => void,
): Promise<nodemailer.SentMessageInfo | undefined> {
  try {
    const mailOptions = {
      from,
      to,
      subject,
      html,
      ...(attachments && { attachments }),
    };
    const email = await transporter.sendMail(mailOptions);
    return email;
  } catch (error) {
    if (errorCallback) {
      if (error instanceof Error) {
        errorCallback(error);
      } else {
        errorCallback(new Error(String(error)));
      }
    }
  }
}
