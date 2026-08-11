const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';

export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailArgs) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    console.error('Email not sent: missing LOVABLE_API_KEY or RESEND_API_KEY');
    return { sent: false, error: 'Email service not configured' };
  }

  const from = Deno.env.get('EMAIL_FROM') ?? 'Social Dashboard <onboarding@resend.dev>';

  try {
    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('Email send failed:', res.status, body);
      return { sent: false, error: `Email send failed (${res.status})` };
    }
    return { sent: true };
  } catch (e) {
    console.error('Email send error:', (e as Error).message);
    return { sent: false, error: (e as Error).message };
  }
}

export function credentialsEmailHtml(opts: {
  fullName: string;
  email: string;
  password: string;
  loginUrl: string;
  roleLabel: string;
}) {
  const { fullName, email, password, loginUrl, roleLabel } = opts;
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#f6f7f9; padding:24px;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">Welcome, ${fullName}</h1>
      <p style="color:#4b5563;font-size:14px;line-height:22px;margin:0 0 16px;">
        Your ${roleLabel} account has been created. Use the credentials below to sign in.
      </p>
      <div style="background:#f3f4f6;border-radius:8px;padding:16px;font-size:14px;color:#111827;margin-bottom:20px;">
        <p style="margin:0 0 8px;"><strong>Email:</strong> ${email}</p>
        <p style="margin:0;"><strong>Temporary password:</strong> ${password}</p>
      </div>
      <a href="${loginUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;">Sign in</a>
      <p style="color:#6b7280;font-size:12px;line-height:20px;margin:24px 0 0;">
        For your security, please change this password after your first login.
      </p>
    </div>
  </div>`;
}
