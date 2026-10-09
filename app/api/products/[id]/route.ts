import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'

const ALLOWED_FIELDS = ['name', 'price', 'color', 'caption', 'image', 'sortOrder', 'isActive'] as const

const MAX_LENGTHS: Record<string, number> = {
  name: 200,
  price: 50,
  color: 50,
  caption: 2000,
  image: 2000,
}

type ProductData = Record<string, string | number | boolean>
type ValidationResult = { data: ProductData } | { error: string }

function validateBody(body: unknown): ValidationResult {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { error: 'صيغة الطلب غير صحيحة' }
  }
  const input = body as Record<string, unknown>
  const keys = Object.keys(input)
  const unknown = keys.filter((key) => !(ALLOWED_FIELDS as readonly string[]).includes(key))
  if (unknown.length > 0) {
    return { error: 'حقول غير معروفة في الطلب' }
  }

  const data: ProductData = {}
  for (const key of keys) {
    const value = input[key]
    if (key === 'isActive') {
      if (typeof value !== 'boolean') return { error: 'قيمة حالة المنتج غير صحيحة' }
      data.isActive = value
    } else if (key === 'sortOrder') {
      const num =
        typeof value === 'number'
          ? value
          : typeof value === 'string' && value.trim() !== ''
            ? Number(value)
            : NaN
      if (!Number.isInteger(num) || num < 0) return { error: 'ترتيب العرض غير صحيح' }
      data.sortOrder = num
    } else if (key === 'name') {
      if (typeof value !== 'string') return { error: 'قيمة نصية غير صحيحة' }
      const trimmed = value.trim()
      if (trimmed === '') return { error: 'اسم المنتج مطلوب' }
      if (trimmed.length > MAX_LENGTHS.name) return { error: 'قيمة نصية أطول من الحد المسموح' }
      data.name = trimmed
    } else {
      if (typeof value !== 'string') return { error: 'قيمة نصية غير صحيحة' }
      const max = MAX_LENGTHS[key] ?? 2000
      if (value.length > max) return { error: 'قيمة نصية أطول من الحد المسموح' }
      data[key] = value
    }
  }
  return { data }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await isAuthenticated()
  if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  try {
    const body = await req.json()
    const result = validateBody(body)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })

    const name = result.data.name
    if (typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'اسم المنتج مطلوب' }, { status: 400 })
    }
    result.data.name = name.trim()

    const product = await db.product.update({
      where: { id: params.id },
      data: result.data as Prisma.ProductUpdateInput,
    })
    return NextResponse.json(product)
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await isAuthenticated()
  if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  try {
    const body = await req.json()
    const result = validateBody(body)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
    if (Object.keys(result.data).length === 0) {
      return NextResponse.json({ error: 'لا توجد حقول للتحديث' }, { status: 400 })
    }

    const product = await db.product.update({
      where: { id: params.id },
      data: result.data as Prisma.ProductUpdateInput,
    })
    return NextResponse.json(product)
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await isAuthenticated()
  if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  try {
    await db.product.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
