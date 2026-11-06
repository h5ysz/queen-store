import { sendMail, type SendResult } from './mailer'

export type WhatsAppResult = {
  ok: boolean
  provider?: string
  status?: number
  detail?: string
  error?: string
}

export type AlertResult = {
  email: SendResult
  whatsapp: WhatsAppResult
}

const BACKUP_URL = 'https://github.com/h5ysz/queen-store/blob/db-backup/backups/db-backup.json'

function riyadhTime(date: Date): string {
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', {
      timeZone: 'Asia/Riyadh',
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return date.toISOString()
  }
}

export async function sendWhatsApp(text: string): Promise<WhatsAppResult> {
  const phone = process.env.WHATSAPP_PHONE
  const apikey = process.env.WHATSAPP_APIKEY
  if (!phone || !apikey) {
    return { ok: false, provider: 'callmebot', error: 'whatsapp-not-configured' }
  }
  try {
    const url =
      'https://api.callmebot.com/whatsapp.php?phone=' +
      encodeURIComponent(phone) +
      '&text=' +
      encodeURIComponent(text) +
      '&apikey=' +
      encodeURIComponent(apikey)
    const res = await fetch(url, { cache: 'no-store' })
    const body = (await res.text()).slice(0, 300)
    const ok = res.ok && !/^\s*error/i.test(body)
    return {
      ok,
      provider: 'callmebot',
      status: res.status,
      detail: body.replace(/\s+/g, ' ').trim().slice(0, 160),
    }
  } catch (e) {
    return { ok: false, provider: 'callmebot', error: String(e).slice(0, 200) }
  }
}

export async function sendBackupAlert(
  errorMessage: string,
  opts?: { test?: boolean },
): Promise<AlertResult> {
  const test = opts?.test === true
  const now = new Date()
  const whenRiyadh = riyadhTime(now)
  const whenUtc = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
  const to = process.env.ALERT_EMAIL || process.env.ADMIN_EMAIL || ''
  const reason = (errorMessage || 'سبب غير معروف').replace(/\s+/g, ' ').trim().slice(0, 600)

  const subject = test
    ? 'اختبار تنبيهات متجر Queen'
    : 'فشل النسخ الاحتياطي لمتجر Queen'

  const intro = test
    ? 'هذه رسالة تجريبية للتأكد من وصول التنبيهات إلى بريدك وواتسابك. لا يوجد أي فشل فعلي.'
    : 'تعذّر رفع النسخة الاحتياطية اليومية إلى GitHub. الموقع يعمل بشكل طبيعي، وآخر نسخة ناجحة ما زالت محفوظة في GitHub.'

  const text = [
    (test ? '[اختبار] ' : '') + 'متجر Queen — النسخ الاحتياطي',
    '',
    intro,
    '',
    'الوقت: ' + whenRiyadh,
    'UTC: ' + whenUtc,
    test ? '' : 'السبب: ' + reason,
    '',
    'آخر نسخة احتياطية: ' + BACKUP_URL,
  ]
    .filter((line) => line !== '')
    .join('\n')

  const html = `<!doctype html>
<html dir="rtl" lang="ar">
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:#111111;padding:24px;text-align:center;">
            <div style="color:#c8a24a;font-size:24px;font-weight:700;letter-spacing:1px;">Queen Store</div>
            <div style="color:#ffffff;font-size:13px;margin-top:6px;opacity:0.85;">تنبيهات النسخ الاحتياطي</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <h1 style="margin:0 0 14px;font-size:19px;color:${test ? '#166534' : '#b91c1c'};text-align:right;">${subject}</h1>
            <p style="margin:0 0 16px;font-size:14px;color:#444;line-height:1.8;text-align:right;">${intro}</p>
            <p style="margin:0 0 8px;font-size:13px;color:#555;text-align:right;"><strong>الوقت:</strong> ${whenRiyadh}</p>
            <p style="margin:0 0 16px;font-size:13px;color:#555;text-align:right;"><strong>UTC:</strong> ${whenUtc}</p>
            ${
              test
                ? ''
                : `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 14px;margin:0 0 18px;">
                    <div style="font-size:12px;color:#991b1b;margin-bottom:6px;font-weight:700;">تفاصيل الخطأ</div>
                    <div style="font-size:12px;color:#7f1d1d;word-break:break-word;direction:ltr;text-align:left;">${reason
                      .replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')}</div>
                  </div>`
            }
            <div style="text-align:center;margin:18px 0;">
              <a href="${BACKUP_URL}" style="display:inline-block;background:#c8a24a;color:#111111;text-decoration:none;font-weight:700;font-size:14px;padding:11px 26px;border-radius:8px;">عرض آخر نسخة احتياطية</a>
            </div>
            <p style="margin:0;font-size:12px;color:#999;text-align:right;">رسالة آلية من متجر Queen. لا حاجة للرد عليها.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const waText = test
    ? '[اختبار] تنبيهات متجر Queen تعمل بنجاح ✅\nالوقت: ' + whenRiyadh
    : '⚠️ فشل النسخ الاحتياطي — متجر Queen\nالوقت: ' +
      whenRiyadh +
      '\nالسبب: ' +
      reason.slice(0, 250) +
      '\nالموقع يعمل بشكل طبيعي، وآخر نسخة ناجحة محفوظة في GitHub.'

  const [emailRes, waRes] = await Promise.all([
    to
      ? sendMail({ to, subject, html, text })
      : Promise.resolve<SendResult>({ ok: false, error: 'alert-email-not-configured' }),
    sendWhatsApp(waText),
  ])

  return { email: emailRes, whatsapp: waRes }
}
