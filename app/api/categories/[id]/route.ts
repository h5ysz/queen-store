import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await isAuthenticated()
  if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  try {
    const current = await db.category.findUnique({ where: { id: params.id } })
    if (!current) return NextResponse.json({ error: 'التصنيف غير موجود' }, { status: 404 })

    const body = await req.json()
    const data: any = {}

    if (body.name !== undefined) {
      const name = str(body.name, 100)
      if (!name) return NextResponse.json({ error: 'اسم التصنيف مطلوب' }, { status: 400 })
      data.name = name
    }
    if (body.nameAr !== undefined) data.nameAr = str(body.nameAr, 100)
    if (body.nameEn !== undefined) data.nameEn = str(body.nameEn, 100)
    if (body.description !== undefined) data.description = str(body.description, 2000)
    if (body.descriptionAr !== undefined) data.descriptionAr = str(body.descriptionAr, 2000)
    if (body.descriptionEn !== undefined) data.descriptionEn = str(body.descriptionEn, 2000)
    if (body.slug !== undefined) data.slug = str(body.slug, 120) || null
    if (body.image !== undefined) data.image = str(body.image, 2000)
    if (body.isActive !== undefined) data.isActive = body.isActive !== false
    if (body.sortOrder !== undefined) {
      const n = Number(body.sortOrder)
      if (!Number.isInteger(n) || n < 0) return NextResponse.json({ error: 'ترتيب التصنيف غير صحيح' }, { status: 400 })
      data.sortOrder = n
    }

    if (body.parentId !== undefined) {
      const parentId = str(body.parentId, 100) || null
      if (parentId === params.id) return NextResponse.json({ error: 'لا يمكن جعل التصنيف تابعاً لنفسه' }, { status: 400 })
      if (parentId) {
        const parent = await db.category.findUnique({ where: { id: parentId } })
        if (!parent) return NextResponse.json({ error: 'التصنيف الأب غير موجود' }, { status: 400 })
        let cursor: string | null = parent.id
        while (cursor) {
          if (cursor === params.id) return NextResponse.json({ error: 'لا يمكن نقل تصنيف تحت أحد أبنائه' }, { status: 400 })
          const up: { parentId: string | null } | null = await db.category.findUnique({ where: { id: cursor }, select: { parentId: true } })
          cursor = up ? up.parentId : null
        }
      }
      data.parentId = parentId
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'لا توجد حقول للتحديث' }, { status: 400 })
    }

    const category = await db.category.update({ where: { id: params.id }, data })

    if (data.name && data.name !== current.name) {
      await db.product.updateMany({ where: { categoryId: params.id }, data: { category: data.name } })
    }

    return NextResponse.json(category)
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'يوجد تصنيف بنفس الاسم بالفعل' }, { status: 400 })
    return NextResponse.json({ error: 'حدث خطأ أثناء تحديث التصنيف' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return PATCH(req, { params })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await isAuthenticated()
  if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  try {
    const current = await db.category.findUnique({
      where: { id: params.id },
      include: { _count: { select: { products: true, children: true } } },
    })
    if (!current) return NextResponse.json({ error: 'التصنيف غير موجود' }, { status: 404 })
    if (current._count.children > 0) {
      return NextResponse.json({ error: 'لا يمكن حذف تصنيف يحتوي على تصنيفات فرعية' }, { status: 400 })
    }
    if (current._count.products > 0) {
      return NextResponse.json({ error: 'لا يمكن حذف تصنيف مرتبط بمنتجات. انقل المنتجات أولاً' }, { status: 400 })
    }

    await db.category.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ أثناء حذف التصنيف' }, { status: 500 })
  }
}
