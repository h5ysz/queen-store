import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const wantsInactive = searchParams.get('includeInactive') === 'true'
  const includeInactive = wantsInactive ? await isAuthenticated() : false
  const q = (searchParams.get('q') || '').toString().trim()
  const categoryId = (searchParams.get('categoryId') || '').toString().trim() || undefined
  const parentId = (searchParams.get('parentId') || '').toString().trim() || undefined
  const minPrice = searchParams.get('minPrice') || undefined
  const maxPrice = searchParams.get('maxPrice') || undefined
  const sort = searchParams.get('sort') || undefined
  const skip = Number(searchParams.get('skip')) || 0
  const take = Math.min(Number(searchParams.get('take')) || 50, 200)

  const where: any = {}
  if (!includeInactive) where.isActive = true
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { nameAr: { contains: q, mode: 'insensitive' } },
      { nameEn: { contains: q, mode: 'insensitive' } },
      { caption: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ]
  }
  if (categoryId) where.categoryId = categoryId
  else if (parentId) {
    const children = await db.category.findMany({ where: { parentId }, select: { id: true } })
    const ids = children.map((c) => c.id)
    ids.push(parentId)
    where.categoryId = { in: ids }
  }

  let orderBy: any = { sortOrder: 'asc' as const }
  if (sort === 'newest') orderBy = { createdAt: 'desc' as const }
  if (sort === 'price_asc') orderBy = { price: 'asc' as const }
  if (sort === 'price_desc') orderBy = { price: 'desc' as const }
  if (sort === 'name') orderBy = { name: 'asc' as const }

  const products = await db.product.findMany({
    where,
    orderBy,
    skip,
    take,
    include: { categoryRelation: { select: { id: true, name: true, parentId: true } } },
  })
  return NextResponse.json(products)
}
export async function POST(req: NextRequest) {
  const auth = await isAuthenticated()
  if (!auth) return NextResponse.json({ error: '??? ???? ???????' }, { status: 401 })
  try {
    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: '??? ?????? ?????' }, { status: 400 })
    if (name.length > 200) return NextResponse.json({ error: '??? ?????? ???? ????' }, { status: 400 })
    const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
    const toNonNegInt = (v: unknown) => { const n = typeof v === 'number' ? v : Number(v); return Number.isInteger(n) && n >= 0 ? n : 0 }
    const product = await db.product.create({
      data: {
        name,
        nameAr: str(body.nameAr, 200),
        nameEn: str(body.nameEn, 200),
        slug: str(body.slug, 200) || undefined,
        price: str(body.price, 50),
        salePrice: str(body.salePrice, 50),
        color: str(body.color, 50),
        caption: str(body.caption, 2000),
        description: str(body.description, 4000),
        descriptionAr: str(body.descriptionAr, 4000),
        descriptionEn: str(body.descriptionEn, 4000),
        image: str(body.image, 2000),
        images: Array.isArray(body.images) ? body.images : (body.image ? [body.image] : []),
        category: str(body.category, 100).trim(),
        categoryId: str(body.categoryId, 100) || undefined,
        stock: toNonNegInt(body.stock),
        sortOrder: toNonNegInt(body.sortOrder),
        isActive: body.isActive !== false,
        outOfStock: !!body.outOfStock,
        tags: str(body.tags, 500),
        metaTitle: str(body.metaTitle, 150),
        metaDescription: str(body.metaDescription, 300),
      },
    })
    return NextResponse.json(product)
  } catch (e) {
    return NextResponse.json({ error: '??? ???' }, { status: 500 })
  }
}
