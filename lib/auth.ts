import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { createHmac, timingSafeEqual } from 'crypto'

const SESSION_COOKIE = 'queen_admin_session'

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length === 0) {
    throw new Error('SESSION_SECRET is not set')
  }
  return secret
}

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH
  if (!hash || hash.length === 0) {
    return false
  }
  try {
    return await bcrypt.compare(password, hash)
  } catch {
    return false
  }
}

function sign(data: string): string {
  const hmac = createHmac('sha256', getSessionSecret())
  hmac.update(data)
  return hmac.digest('hex')
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = cookies()
  const session = cookieStore.get(SESSION_COOKIE)
  if (!session || !session.value) return false
  try {
    const raw = Buffer.from(session.value, 'base64').toString('utf8')
    const parsed = JSON.parse(raw)
    const payload = parsed.payload as string | undefined
    const sig = parsed.sig as string | undefined
    if (!payload || !sig) return false

    const expected = sign(payload)
    try {
      const bufA = Buffer.from(expected, 'hex')
      const bufB = Buffer.from(sig, 'hex')
      if (bufA.length !== bufB.length) return false
      if (!timingSafeEqual(bufA, bufB)) return false
    } catch {
      return false
    }

    try {
      const data = JSON.parse(payload) as { authenticated?: boolean; expires?: number }
      if (data.authenticated !== true) return false
      if (typeof data.expires === 'number' && Date.now() > data.expires) return false
    } catch {
      return false
    }
    return true
  } catch {
    return false
  }
}

export async function setSession() {
  const cookieStore = cookies()
  const expires = Date.now() + 7 * 24 * 60 * 60 * 1000
  const payload = JSON.stringify({ authenticated: true, expires })
  const sig = sign(payload)
  const value = Buffer.from(JSON.stringify({ payload, sig })).toString('base64')
  cookieStore.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: new Date(expires),
  })
}

export async function clearSession() {
  const cookieStore = cookies()
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: new Date(0),
  })
}
