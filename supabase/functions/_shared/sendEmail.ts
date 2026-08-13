const GATEWAY_URL = 'https://connector-gateway.lovable.dev/brevo';
const BREVO_DIRECT_URL = 'https://api.brevo.com/v3';

export interface SendEmailArgs {
  to: string;
  toName?: string;
  subject: string;
  html: string;
}

/**
 * Sends a transactional email through Brevo.
 * Uses the Lovable connector gateway when a gateway connection key is present,
 * otherwise falls back to calling the Brevo API directly with BREVO_API_KEY.
 */
export async function sendEmail({ to, toName, subject, html }: SendEmailArgs) {
  const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  if (!BREVO_API_KEY) {
    console.error('Email not sent: missing BREVO_API_KEY');
    return { sent: false, error: 'Email service not configured (BREVO_API_KEY missing)' };
  }

  const senderEmail = Deno.env.get('EMAIL_FROM') ?? 'no-reply@one2onemarketing.in';
  const senderName = Deno.env.get('EMAIL_FROM_NAME') ?? 'One2One Marketing';

  const payload = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: to, ...(toName ? { name: toName } : {}) }],
    subject,
    htmlContent: html,
  };

  // Gateway connection keys are issued by Lovable and start with "lovc_".
  const useGateway = BREVO_API_KEY.startsWith('lovc_') && !!LOVABLE_API_KEY;

  const url = useGateway ? `${GATEWAY_URL}/smtp/email` : `${BREVO_DIRECT_URL}/smtp/email`;
  const headers: Record<string, string> = useGateway
    ? {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': BREVO_API_KEY,
      }
    : {
        'Content-Type': 'application/json',
        accept: 'application/json',
        'api-key': BREVO_API_KEY,
      };

  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Brevo send failed [${res.status}]: ${body}`);
      return { sent: false, error: `Email send failed (${res.status}): ${body}` };
    }
    return { sent: true };
  } catch (e) {
    console.error('Email send error:', (e as Error).message);
    return { sent: false, error: (e as Error).message };
  }
}

export function invitationEmailHtml(opts: {
  fullName: string;
  email: string;
  actionUrl: string;
  roleLabel: string;
  appName?: string;
}) {
  const { fullName, email, actionUrl, roleLabel, appName = 'One2One Marketing' } = opts;
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#f6f7f9; padding:24px;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">Welcome, ${fullName}</h1>
      <p style="color:#4b5563;font-size:14px;line-height:22px;margin:0 0 16px;">
        Your ${roleLabel} account on ${appName} has been created for <strong>${email}</strong>.
        Click the button below to complete your registration and set your own password.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${actionUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;">Set your password</a>
      </p>
      <p style="color:#6b7280;font-size:12px;line-height:20px;margin:0 0 8px;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="word-break:break-all;font-size:12px;color:#2563eb;margin:0 0 24px;">${actionUrl}</p>
      <p style="color:#6b7280;font-size:12px;line-height:20px;margin:0;">
        This link expires in 24 hours. If you did not expect this email, you can safely ignore it.
      </p>
    </div>
  </div>`;
}
