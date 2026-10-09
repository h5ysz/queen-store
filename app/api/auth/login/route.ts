import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, setSession } from '@/lib/auth'

const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 10

const failures = new Map<string, { count: number; resetAt: number }>()

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

function isBlocked(key: string): boolean {
  const record = failures.get(key)
  if (!record) return false
  if (Date.now() > record.resetAt) {
    failures.delete(key)
    return false
  }
  return record.count >= MAX_FAILURES
}

function registerFailure(key: string): void {
  const now = Date.now()
  const record = failures.get(key)
  if (!record || now > record.resetAt) {
    failures.set(key, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    record.count += 1
  }
  if (failures.size > 5000) {
    for (const [storedKey, storedValue] of failures) {
      if (now > storedValue.resetAt) failures.delete(storedKey)
    }
  }
}

function clearFailures(key: string): void {
  failures.delete(key)
}

export async function POST(req: NextRequest) {
  const key = clientKey(req)

  if (isBlocked(key)) {
    return NextResponse.json(
      { error: 'تم تجاوز عدد المحاولات المسموح. حاول لاحقًا.' },
      { status: 429, headers: { 'Retry-After': '900' } }
    )
  }

  try {
    const body = await req.json()
    const password = body.password?.toString() || ''
    const ok = await verifyPassword(password)
    if (!ok) {
      registerFailure(key)
      return NextResponse.json({ error: 'كلمة المرور غير صحيحة' }, { status: 401 })
    }
    clearFailures(key)
    await setSession()
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
