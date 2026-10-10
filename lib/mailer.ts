import nodemailer from 'nodemailer'

type SendResult = { ok: boolean; provider?: string; error?: string }

function renderResetEmail(link: string): string {
  return `<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>إعادة تعيين كلمة المرور</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Cairo','Segoe UI',Tahoma,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:#111111;padding:28px 24px;text-align:center;">
              <div style="color:#c8a24a;font-size:26px;font-weight:700;letter-spacing:1px;">Queen Store</div>
              <div style="color:#ffffff;font-size:14px;margin-top:6px;opacity:0.85;">لوحة الإدارة</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px;">
              <h1 style="margin:0 0 16px;font-size:20px;color:#111111;text-align:right;">إعادة تعيين كلمة المرور</h1>
              <p style="margin:0 0 14px;font-size:15px;color:#444;line-height:1.7;text-align:right;">
                وصلنا طلب لإعادة تعيين كلمة مرور لوحة إدارة Queen Store. اضغط على الزر أدناه لتعيين كلمة مرور جديدة.
              </p>
              <div style="text-align:center;margin:26px 0;">
                <a href="${link}" style="display:inline-block;background:#c8a24a;color:#111111;text-decoration:none;font-weight:700;font-size:15px;padding:13px 34px;border-radius:8px;">
                  تعيين كلمة مرور جديدة
                </a>
              </div>
              <p style="margin:0 0 8px;font-size:13px;color:#666;text-align:right;">
                هذا الرابط صالح لمدة <strong>15 دقيقة</strong> ومن أجل <strong>استخدام واحد فقط</strong>.
              </p>
              <p style="margin:0 0 18px;font-size:13px;color:#666;text-align:right;">
                إذا لم تطلب إعادة التعيين، تجاهل هذه الرسالة، وستبقى كلمة مرورك كما هي.
              </p>
              <p style="margin:0;font-size:12px;color:#999;text-align:right;word-break:break-all;">
                إذا لم يعمل الزر، انسخ هذا الرابط والصقه في المتصفح:<br/>
                <a href="${link}" style="color:#c8a24a;">${link}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#fafafa;padding:16px 24px;text-align:center;font-size:12px;color:#999;">
              هذه رسالة آلية من Queen Store. الرجاء عدم الرد عليها.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function renderResetText(link: string): string {
  return [
    'Queen Store - إعادة تعيين كلمة مرور لوحة الإدارة',
    '',
    'وصلنا طلب لإعادة تعيين كلمة مرور لوحة إدارة Queen Store.',
    'افتح الرابط التالي لتعيين كلمة مرور جديدة (صالح 15 دقيقة ومن استخدام واحد فقط):',
    link,
    '',
    'إذا لم تطلب إعادة التعيين، تجاهل هذه الرسالة.',
  ].join('\n')
}

export async function sendPasswordResetEmail(to: string, link: string): Promise<SendResult> {
  const from = process.env.MAIL_FROM || 'Queen Store <onboarding@resend.dev>'
  const subject = 'إعادة تعيين كلمة مرور لوحة Queen Store'
  const html = renderResetEmail(link)
  const text = renderResetText(link)

  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to: [to], subject, html, text }),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        return { ok: false, provider: 'resend', error: `${res.status} ${body}`.slice(0, 300) }
      }
      return { ok: true, provider: 'resend' }
    } catch (e) {
      return { ok: false, provider: 'resend', error: String(e).slice(0, 300) }
    }
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const port = Number(process.env.SMTP_PORT || 465)
      const secureEnv = process.env.SMTP_SECURE
      const secure = secureEnv !== undefined && secureEnv !== '' ? secureEnv === 'true' : port === 465
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
      await transporter.sendMail({ from, to, subject, html, text })
      return { ok: true, provider: 'smtp' }
    } catch (e) {
      return { ok: false, provider: 'smtp', error: String(e).slice(0, 300) }
    }
  }

  return { ok: false, error: 'email-not-configured' }
}
