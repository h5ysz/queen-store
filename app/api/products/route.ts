import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const wantsInactive = searchParams.get('includeInactive') === 'true'
  const includeInactive = wantsInactive ? await isAuthenticated() : false
  const products = await db.product.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json(products)
}

export async function POST(req: NextRequest) {
  const auth = await isAuthenticated()
  if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  try {
    const body = await req.json()
    const product = await db.product.create({
      data: {
        name: body.name || '',
        price: body.price || '0',
        color: body.color || '',
        caption: body.caption || '',
        image: body.image || '',
        sortOrder: Number(body.sortOrder) || 0,
        isActive: body.isActive !== false,
      },
    })
    return NextResponse.json(product)
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
