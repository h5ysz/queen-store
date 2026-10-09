import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'
import { db } from '@/lib/db'

function normalizeEmail(email: string | null | undefined): string {
  return (email || '').trim().toLowerCase()
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12)
}

export function fingerprint(hash: string | null | undefined): string {
  return createHash('sha256').update(hash || '').digest('hex')
}

async function loadAccount() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL || '')
  const envHash = process.env.ADMIN_PASSWORD_HASH || null

  const found = await db.adminAccount.findUnique({ where: { id: 'primary' } })
  if (found) return found
  try {
    return await db.adminAccount.create({ data: { id: 'primary', email, passwordHash: envHash } })
  } catch {
    const existing = await db.adminAccount.findUnique({ where: { id: 'primary' } })
    if (existing) return existing
    throw new Error('admin account unavailable')
  }
}

export async function getAdminEmail(): Promise<string> {
  const acc = await loadAccount()
  return (acc.email || process.env.ADMIN_EMAIL || '').trim().toLowerCase()
}

export async function emailMatchesAdmin(email: string): Promise<boolean> {
  try {
    const target = await getAdminEmail()
    return !!target && email.trim().toLowerCase() === target
  } catch {
    return false
  }
}

async function effectiveHash(): Promise<string | null> {
  const acc = await loadAccount()
  if (acc.passwordHash && acc.passwordHash.length > 0) return acc.passwordHash
  return process.env.ADMIN_PASSWORD_HASH || null
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!password) return false
  try {
    const hash = await effectiveHash()
    if (!hash) return false
    return await bcrypt.compare(password, hash)
  } catch {
    return false
  }
}

export async function getSessionFingerprint(): Promise<{ sv: number; pv: string }> {
  const acc = await loadAccount()
  const hash = await effectiveHash()
  return { sv: acc.sessionVersion, pv: fingerprint(hash) }
}

export async function setAdminPassword(newPassword: string): Promise<void> {
  const hash = hashPassword(newPassword)
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  await db.adminAccount.upsert({
    where: { id: 'primary' },
    update: { passwordHash: hash, sessionVersion: { increment: 1 } },
    create: { id: 'primary', email, passwordHash: hash },
  })
}
