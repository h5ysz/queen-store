import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendBackupAlert } from '@/lib/alerts'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const REPO = process.env.GH_BACKUP_REPO || 'h5ysz/queen-store'
const BRANCH = process.env.GH_BACKUP_BRANCH || 'db-backup'
const FILE = 'backups/db-backup.json'

function ghHeaders(): Record<string, string> {
  return {
    Authorization: 'Bearer ' + (process.env.GH_BACKUP_TOKEN || ''),
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'queen-store-backup',
  }
}

async function gh(path: string, init?: RequestInit) {
  const res = await fetch('https://api.github.com' + path, {
    ...init,
    headers: { ...ghHeaders(), ...((init?.headers as Record<string, string>) || {}) },
  })
  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  if (!res.ok) {
    throw new Error('GitHub ' + path + ' -> ' + res.status + ' ' + text.slice(0, 300))
  }
  return body as Record<string, any>
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || ''
  const auth = req.headers.get('authorization') || ''
  if (!secret || auth !== 'Bearer ' + secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  // Test notifications end-to-end without touching the database.
  // GET /api/backup?notify=test  (requires CRON_SECRET)
  if (req.nextUrl.searchParams.get('notify') === 'test') {
    const alert = await sendBackupAlert('رسالة تجريبية', { test: true })
    return NextResponse.json({ ok: true, test: true, ...alert })
  }

  if (!process.env.GH_BACKUP_TOKEN) {
    const alert = await sendBackupAlert('GH_BACKUP_TOKEN غير مضبوط في إعدادات Vercel')
    return NextResponse.json(
      { error: 'GH_BACKUP_TOKEN is not configured', alert },
      { status: 500 },
    )
  }

  try {
    const [products, categories, options, variants] = await Promise.all([
      db.product.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.category.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.productOption.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.productVariant.findMany(),
    ])

    // Deterministic payload (no timestamps) so unchanged data produces the same blob.
    const payload = {
      schemaVersion: 1,
      source: 'queen-store',
      tables: {
        Category: categories,
        Product: products,
        ProductOption: options,
        ProductVariant: variants,
      },
    }
    const json = JSON.stringify(payload)
    const bytes = Buffer.byteLength(json)

    if (req.nextUrl.searchParams.get('dry') === '1') {
      return NextResponse.json({
        ok: true,
        dry: true,
        bytes,
        products: products.length,
        categories: categories.length,
        options: options.length,
        variants: variants.length,
      })
    }

    const content = Buffer.from(json, 'utf8').toString('base64')
    const blob = await gh(`/repos/${REPO}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content, encoding: 'base64' }),
    })
    const tree = await gh(`/repos/${REPO}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({
        tree: [{ path: FILE, mode: '100644', type: 'blob', sha: blob.sha }],
      }),
    })
    const commit = await gh(`/repos/${REPO}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message: 'db backup ' + new Date().toISOString().slice(0, 10),
        tree: tree.sha,
        parents: [],
      }),
    })

    const refUrl = `https://api.github.com/repos/${REPO}/git/ref/heads/${BRANCH}`
    const refRes = await fetch(refUrl, { headers: ghHeaders() })
    if (refRes.ok) {
      await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: commit.sha, force: true }),
      })
    } else {
      await gh(`/repos/${REPO}/git/refs`, {
        method: 'POST',
        body: JSON.stringify({ ref: 'refs/heads/' + BRANCH, sha: commit.sha }),
      })
    }

    return NextResponse.json({
      ok: true,
      bytes,
      products: products.length,
      categories: categories.length,
      options: options.length,
      variants: variants.length,
      branch: BRANCH,
      commit: commit.sha,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    let alert: unknown = null
    try {
      alert = await sendBackupAlert(message)
    } catch (alertError) {
      alert = { ok: false, error: String(alertError).slice(0, 300) }
    }
    return NextResponse.json({ error: message, alert }, { status: 500 })
  }
}
