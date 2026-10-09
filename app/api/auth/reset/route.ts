import { NextRequest, NextResponse } from 'next/server'
import { consumeResetToken } from '@/lib/reset'
import { setAdminPassword } from '@/lib/admin'
import { clearSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const token = (body.token || '').toString().trim()
    const password = (body.password || '').toString()
    const confirm = (body.confirm ?? body.confirmPassword ?? '').toString()

    if (!token) {
      return NextResponse.json({ error: 'رابط إعادة التعيين غير صالح.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.' }, { status: 400 })
    }
    if (confirm && password !== confirm) {
      return NextResponse.json({ error: 'كلمتا المرور غير متطابقتين.' }, { status: 400 })
    }

    const result = await consumeResetToken(token)
    if (!result.ok) {
      const message =
        result.reason === 'expired'
          ? 'انتهت صلاحية الرابط. اطلب رابطًا جديدًا.'
          : 'الرابط غير صالح أو تم استخدامه مسبقًا.'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    await setAdminPassword(password)
    await clearSession()
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ، حاول لاحقًا.' }, { status: 500 })
  }
}
