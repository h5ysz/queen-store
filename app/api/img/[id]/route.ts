import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const iParam = req.nextUrl.searchParams.get('i')
  const product = await db.product.findUnique({
    where: { id: params.id },
    select: { image: true, images: true },
  })
  if (!product) return new NextResponse('Not found', { status: 404 })

  const list = Array.isArray(product.images)
    ? (product.images as unknown[]).filter((x): x is string => typeof x === 'string')
    : []

  let raw = ''
  if (iParam === null || iParam === 'main') {
    raw = product.image || ''
  } else {
    const i = Number.parseInt(iParam, 10)
    raw = Number.isInteger(i) && i >= 0 ? list[i] || '' : ''
  }
  if (!raw) return new NextResponse('Not found', { status: 404 })

  if (/^https?:\/\//.test(raw)) return NextResponse.redirect(raw)
  if (raw.startsWith('data:')) {
    const m = raw.match(/^data:([^;,]+)(;base64)?,([\s\S]*)$/)
    if (!m) return new NextResponse('Not found', { status: 404 })
    const type = m[1] || 'image/jpeg'
    const buf = m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]), 'utf8')
    return new NextResponse(buf, {
      headers: {
        'Content-Type': type,
        'Content-Length': String(buf.length),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  }

  const target = new URL('/' + raw.replace(/^\/+/, ''), req.nextUrl.origin)
  return NextResponse.redirect(target)
}
