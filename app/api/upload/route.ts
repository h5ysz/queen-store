import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'

const MAX_FILE_SIZE = 5 * 1024 * 1024

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}

export async function POST(req: NextRequest) {
  const auth = await isAuthenticated()
  if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

  try {
    const formData = await req.formData()
    const uploaded = formData.get('file')
    if (!uploaded || typeof uploaded === 'string' || typeof uploaded.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'لم يتم اختيار ملف' }, { status: 400 })
    }
    const file = uploaded as File

    if (file.size === 0) {
      return NextResponse.json({ error: 'الملف فارغ' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'حجم الصورة يتجاوز الحد المسموح (5 ميجابايت)' }, { status: 413 })
    }

    const declared = (file.type || '').toLowerCase()
    if (declared && !(declared in ALLOWED_TYPES)) {
      return NextResponse.json({ error: 'نوع الصورة غير مدعوم (JPEG أو PNG أو WebP فقط)' }, { status: 415 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const detected = sniffImageType(bytes)
    if (!detected || !(detected in ALLOWED_TYPES)) {
      return NextResponse.json({ error: 'محتوى الملف ليس صورة مدعومة' }, { status: 415 })
    }
    if (declared && declared !== detected) {
      return NextResponse.json({ error: 'نوع الملف لا يطابق محتواه' }, { status: 415 })
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN

    if (!blobToken) {
      return NextResponse.json(
        {
          error: 'الرجاء إضافة BLOB_READ_WRITE_TOKEN في Environment Variables',
          note: 'لم يتم رفع الصور حاليًا. أضف Vercel Blob Token من إعدادات مشروع Vercel لتشغيل رفع الصور.',
          fallback: 'يمكنك بدلًا من ذلك استخدام مسار صورة موجودة (مثل /img-XX.jpg أو رابط مباشر) عند تعديل المنتج.',
        },
        { status: 501 }
      )
    }

    try {
      const { put } = await import('@vercel/blob')
      const extension = ALLOWED_TYPES[detected]
      const pathname = `products/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`
      const blob = await put(pathname, file, {
        access: 'public',
        token: blobToken,
        addRandomSuffix: true,
      })
      return NextResponse.json({ url: blob.url })
    } catch {
      return NextResponse.json({ error: 'فشل رفع الصورة إلى Vercel Blob' }, { status: 500 })
    }
  } catch {
    return NextResponse.json({ error: 'فشل رفع الملف' }, { status: 500 })
  }
}
