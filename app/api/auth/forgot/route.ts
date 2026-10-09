import { NextRequest, NextResponse } from 'next/server'
import { emailMatchesAdmin } from '@/lib/admin'
import { getRequestCounts, recordRequest, canSendToEmail, ipExceeded, createResetToken } from '@/lib/reset'
import { sendPasswordResetEmail } from '@/lib/mailer'

export const dynamic = 'force-dynamic'

const GENERIC = {
  success: true,
  message: 'إذا كان البريد مسجّلًا لدينا، فسيصلك رابط لإعادة تعيين كلمة المرور خلال دقائق.',
}

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || ''
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  let email = ''
  try {
    const body = await req.json().catch(() => ({}))
    email = (body.email || '').toString().trim().toLowerCase()
  } catch {
    email = ''
  }

  try {
    if (ip) {
      const { ipCount } = await getRequestCounts(email || '__anon__', ip)
      if (ipExceeded(ipCount)) {
        return NextResponse.json(
          { error: 'تم تجاوز عدد المحاولات المسموح. حاول لاحقًا.' },
          { status: 429, headers: { 'Retry-After': '900' } }
        )
      }
    }

    if (!email) return NextResponse.json(GENERIC)

    const { emailCount, last } = await getRequestCounts(email, ip)
    await recordRequest(email, ip)

    const matches = await emailMatchesAdmin(email)
    if (!matches) return NextResponse.json(GENERIC)
    if (!canSendToEmail(emailCount, last?.createdAt)) return NextResponse.json(GENERIC)

    const token = await createResetToken(email, ip)
    const base = (process.env.APP_URL || req.nextUrl.origin).replace(/\/$/, '')
    const link = `${base}/admin/reset?token=${token}`
    const result = await sendPasswordResetEmail(email, link)
    if (!result.ok) {
      console.error('[forgot] reset email failed:', result.provider || 'n/a', result.error)
    }
  } catch (e) {
    console.error('[forgot] error:', e)
  }

  return NextResponse.json(GENERIC)
}
