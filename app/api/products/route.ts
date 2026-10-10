import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const toNonNegInt = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isInteger(n) && n >= 0 ? n : 0
}
const toImages = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.length <= 2000).slice(0, 12) : []

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
  const take = Math.min(Number(searchParams.get('take')) || 200, 500)

  const where: any = {}
  if (!includeInactive) where.isActive = true
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { nameAr: { contains: q, mode: 'insensitive' } },
      { nameEn: { contains: q, mode: 'insensitive' } },
      { caption: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { tags: { contains: q, mode: 'insensitive' } },
    ]
  }
  if (categoryId) where.categoryId = categoryId
  else if (parentId) {
    const children = await db.category.findMany({ where: { parentId }, select: { id: true } })
    where.categoryId = { in: [parentId, ...children.map((c) => c.id)] }
  }

  let orderBy: any = [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
  if (sort === 'newest') orderBy = { createdAt: 'desc' }
  if (sort === 'price_asc') orderBy = { price: 'asc' }
  if (sort === 'price_desc') orderBy = { price: 'desc' }
  if (sort === 'name') orderBy = { name: 'asc' }

  const products = await db.product.findMany({
    where,
    orderBy,
    skip,
    take,
    include: { categoryRelation: { select: { id: true, name: true, nameAr: true, nameEn: true, parentId: true } } },
  })
  return NextResponse.json(products)
}

export async function POST(req: NextRequest) {
  const auth = await isAuthenticated()
  if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  try {
    const body = await req.json()
    const name = str(body.name, 200)
    if (!name) return NextResponse.json({ error: 'اسم المنتج مطلوب' }, { status: 400 })

    const categoryId = str(body.categoryId, 100) || null
    let categoryName = str(body.category, 100)
    if (categoryId) {
      const cat = await db.category.findUnique({ where: { id: categoryId } })
      if (!cat) return NextResponse.json({ error: 'التصنيف غير موجود' }, { status: 400 })
      categoryName = cat.name
    }

    const images = toImages(body.images)
    const image = str(body.image, 2000) || images[0] || ''

    const product = await db.product.create({
      data: {
        name,
        nameAr: str(body.nameAr, 200),
        nameEn: str(body.nameEn, 200),
        slug: str(body.slug, 200) || null,
        price: str(body.price, 50),
        salePrice: str(body.salePrice, 50),
        color: str(body.color, 50),
        caption: str(body.caption, 2000),
        description: str(body.description, 4000),
        descriptionAr: str(body.descriptionAr, 4000),
        descriptionEn: str(body.descriptionEn, 4000),
        image,
        images: images.length ? images : image ? [image] : [],
        category: categoryName,
        categoryId,
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
  } catch {
    return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء المنتج' }, { status: 500 })
  }
}
