import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendWeeklySummaryEmail, type WeeklySummary } from '@/lib/alerts'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const REPO = process.env.GH_BACKUP_REPO || 'h5ysz/queen-store'
const BRANCH = process.env.GH_BACKUP_BRANCH || 'db-backup'

const GH_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'queen-store-weekly',
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || ''
  const auth = req.headers.get('authorization') || ''
  if (!secret || auth !== 'Bearer ' + secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const summary: WeeklySummary = {
    products: 0,
    categories: 0,
    activeProducts: 0,
    outOfStock: 0,
    embeddedImages: 0,
    galleryImages: 0,
  }

  try {
    const [products, categories] = await Promise.all([
      db.product.findMany({
        select: { image: true, images: true, isActive: true, outOfStock: true },
      }),
      db.category.count(),
    ])

    summary.products = products.length
    summary.categories = categories
    summary.activeProducts = products.filter((p) => p.isActive !== false).length
    summary.outOfStock = products.filter((p) => p.outOfStock === true).length
    summary.embeddedImages = products.filter((p) => String(p.image || '').startsWith('data:')).length
    summary.galleryImages = products.reduce((total, p) => {
      if (!Array.isArray(p.images)) return total
      return total + (p.images as unknown[]).filter((x) => String(x).startsWith('data:')).length
    }, 0)
  } catch (e) {
    summary.dbError = e instanceof Error ? e.message : String(e)
  }

  try {
    const refRes = await fetch(`https://api.github.com/repos/${REPO}/git/ref/heads/${BRANCH}`, {
      headers: GH_HEADERS,
      cache: 'no-store',
    })
    if (!refRes.ok) throw new Error('GitHub ref -> ' + refRes.status)
    const ref = await refRes.json()
    const sha: string | undefined = ref?.object?.sha
    if (!sha) throw new Error('GitHub ref has no sha')
    summary.lastCommit = sha

    const commitRes = await fetch(`https://api.github.com/repos/${REPO}/git/commits/${sha}`, {
      headers: GH_HEADERS,
      cache: 'no-store',
    })
    if (!commitRes.ok) throw new Error('GitHub commit -> ' + commitRes.status)
    const commit = await commitRes.json()
    const date = commit?.committer?.date || commit?.author?.date
    if (date) summary.lastBackupAt = date

    const fileRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/backups/db-backup.json?ref=${encodeURIComponent(BRANCH)}`,
      { headers: GH_HEADERS, cache: 'no-store' },
    )
    if (!fileRes.ok) throw new Error('GitHub file -> ' + fileRes.status)
    const file = await fileRes.json()
    if (typeof file?.size === 'number') summary.lastBackupBytes = file.size
  } catch (e) {
    summary.backupError = e instanceof Error ? e.message : String(e)
  }

  const email = await sendWeeklySummaryEmail(summary)
  return NextResponse.json({ ok: email.ok, summary, email }, { status: email.ok ? 200 : 500 })
}
