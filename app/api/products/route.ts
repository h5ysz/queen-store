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
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'اسم المنتج مطلوب' }, { status: 400 })
    if (name.length > 200) return NextResponse.json({ error: 'اسم المنتج أطول من الحد المسموح' }, { status: 400 })

    const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
    const toNonNegInt = (v: unknown) => {
      const n = typeof v === 'number' ? v : Number(v)
      return Number.isInteger(n) && n >= 0 ? n : 0
    }

    const product = await db.product.create({
      data: {
        name,
        price: str(body.price, 50),
        color: str(body.color, 50),
        caption: str(body.caption, 2000),
        image: str(body.image, 2000),
        category: str(body.category, 100).trim(),
        stock: toNonNegInt(body.stock),
        sortOrder: toNonNegInt(body.sortOrder),
        isActive: body.isActive !== false,
      },
    })
    return NextResponse.json(product)
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
