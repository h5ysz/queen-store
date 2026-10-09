import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await isAuthenticated()
  if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  try {
    const body = await req.json()
    const data: { name?: string; sortOrder?: number } = {}

    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      if (!name) return NextResponse.json({ error: 'اسم التصنيف مطلوب' }, { status: 400 })
      if (name.length > 100) return NextResponse.json({ error: 'اسم التصنيف أطول من الحد المسموح' }, { status: 400 })
      data.name = name
    }

    if (body.sortOrder !== undefined) {
      const n = Number(body.sortOrder)
      if (!Number.isInteger(n) || n < 0) return NextResponse.json({ error: 'ترتيب التصنيف غير صحيح' }, { status: 400 })
      data.sortOrder = n
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'لا توجد حقول للتحديث' }, { status: 400 })
    }

    const current = await db.category.findUnique({ where: { id: params.id } })
    if (!current) return NextResponse.json({ error: 'التصنيف غير موجود' }, { status: 404 })

    const category = await db.category.update({ where: { id: params.id }, data })

    if (data.name && data.name !== current.name) {
      await db.product.updateMany({ where: { category: current.name }, data: { category: data.name } })
    }

    return NextResponse.json(category)
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return PATCH(req, { params })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await isAuthenticated()
  if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  try {
    const current = await db.category.findUnique({ where: { id: params.id } })
    if (!current) return NextResponse.json({ error: 'التصنيف غير موجود' }, { status: 404 })

    await db.category.delete({ where: { id: params.id } })
    await db.product.updateMany({ where: { category: current.name }, data: { category: '' } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
