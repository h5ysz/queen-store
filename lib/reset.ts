import { createHash, randomBytes } from 'crypto'
import { db } from '@/lib/db'

export const RESET_TTL_MS = 15 * 60 * 1000
const WINDOW_MS = 15 * 60 * 1000
const COOLDOWN_MS = 60 * 1000
const MAX_PER_EMAIL = 5
const MAX_PER_IP = 15

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export async function getRequestCounts(email: string, ip: string) {
  const since = new Date(Date.now() - WINDOW_MS)
  const [emailCount, ipCount, last] = await Promise.all([
    db.resetRequest.count({ where: { email, createdAt: { gte: since } } }),
    ip ? db.resetRequest.count({ where: { ip, createdAt: { gte: since } } }) : Promise.resolve(0),
    db.resetRequest.findFirst({ where: { email }, orderBy: { createdAt: 'desc' } }),
  ])
  return { emailCount, ipCount, last }
}

export async function recordRequest(email: string, ip: string) {
  await db.resetRequest.create({ data: { email, ip } })
}

export function canSendToEmail(emailCount: number, last: Date | null | undefined): boolean {
  if (emailCount >= MAX_PER_EMAIL) return false
  if (last && Date.now() - new Date(last).getTime() < COOLDOWN_MS) return false
  return true
}

export function ipExceeded(ipCount: number): boolean {
  return ipCount >= MAX_PER_IP
}

export async function createResetToken(email: string, ip: string): Promise<string> {
  const token = generateToken()
  await db.passwordReset.create({
    data: {
      email,
      tokenHash: hashToken(token),
      ip,
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  })
  return token
}

export async function consumeResetToken(token: string): Promise<{ ok: boolean; reason?: string; email?: string }> {
  if (!token) return { ok: false, reason: 'invalid' }
  const record = await db.passwordReset.findUnique({ where: { tokenHash: hashToken(token) } })
  if (!record) return { ok: false, reason: 'invalid' }
  if (record.usedAt) return { ok: false, reason: 'used' }
  if (Date.now() > new Date(record.expiresAt).getTime()) return { ok: false, reason: 'expired' }

  const claimed = await db.passwordReset.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  })
  if (claimed.count !== 1) return { ok: false, reason: 'used' }
  return { ok: true, email: record.email }
}
