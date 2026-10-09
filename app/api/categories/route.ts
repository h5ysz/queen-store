import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const categories = await db.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const auth = await isAuthenticated()
  if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  try {
    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'اسم التصنيف مطلوب' }, { status: 400 })
    if (name.length > 100) return NextResponse.json({ error: 'اسم التصنيف أطول من الحد المسموح' }, { status: 400 })

    const sortOrder = Number.isInteger(Number(body.sortOrder)) && Number(body.sortOrder) >= 0 ? Number(body.sortOrder) : 0

    const existing = await db.category.findUnique({ where: { name } })
    if (existing) return NextResponse.json({ error: 'هذا التصنيف موجود مسبقًا' }, { status: 409 })

    const category = await db.category.create({ data: { name, sortOrder } })
    return NextResponse.json(category, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
