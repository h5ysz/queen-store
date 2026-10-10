import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const wantsInactive = searchParams.get('includeInactive') === 'true'
  const includeInactive = wantsInactive ? await isAuthenticated() : false
  const parentIdParam = searchParams.get('parentId')

  const where: any = {}
  if (!includeInactive) where.isActive = true
  if (parentIdParam !== null) {
    if (parentIdParam === 'root' || parentIdParam === '') where.parentId = null
    else where.parentId = parentIdParam
  }

  const categories = await db.category.findMany({
    where,
    orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: true, children: true } } },
  })
  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const auth = await isAuthenticated()
  if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  try {
    const body = await req.json()
    const name = str(body.name, 100)
    if (!name) return NextResponse.json({ error: 'اسم التصنيف مطلوب' }, { status: 400 })

    const parentId = str(body.parentId, 100) || null
    if (parentId) {
      const parent = await db.category.findUnique({ where: { id: parentId } })
      if (!parent) return NextResponse.json({ error: 'التصنيف الأب غير موجود' }, { status: 400 })
    }

    const category = await db.category.create({
      data: {
        name,
        nameAr: str(body.nameAr, 100),
        nameEn: str(body.nameEn, 100),
        description: str(body.description, 2000),
        descriptionAr: str(body.descriptionAr, 2000),
        descriptionEn: str(body.descriptionEn, 2000),
        slug: str(body.slug, 120) || null,
        parentId,
        image: str(body.image, 2000),
        sortOrder: Number.isInteger(Number(body.sortOrder)) && Number(body.sortOrder) >= 0 ? Number(body.sortOrder) : 0,
        isActive: body.isActive !== false,
      },
    })
    return NextResponse.json(category)
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'يوجد تصنيف بنفس الاسم بالفعل' }, { status: 400 })
    return NextResponse.json({ error: 'حدث خطأ أثناء إنشاء التصنيف' }, { status: 500 })
  }
}
