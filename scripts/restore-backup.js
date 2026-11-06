// استعادة نسخة احتياطية (JSON) إلى قاعدة البيانات.
// الاستخدام:
//   node scripts/restore-backup.js backups/db-backup.json
//   node scripts/restore-backup.js backups/db-backup.json --dry-run   (تجربة بدون حفظ)
const fs = require('fs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const DRY = process.argv.includes('--dry-run')
const file = process.argv.slice(2).find((a) => !a.startsWith('--'))

const toDate = (v) => (v ? new Date(v) : undefined)

function productData(p) {
  return {
    id: p.id,
    name: p.name,
    nameAr: p.nameAr ?? '',
    nameEn: p.nameEn ?? '',
    slug: p.slug ?? null,
    price: p.price ?? '',
    salePrice: p.salePrice ?? '',
    color: p.color ?? '',
    caption: p.caption ?? '',
    description: p.description ?? '',
    descriptionAr: p.descriptionAr ?? '',
    descriptionEn: p.descriptionEn ?? '',
    image: p.image ?? '',
    images: p.images ?? [],
    category: p.category ?? '',
    categoryId: p.categoryId ?? null,
    stock: p.stock ?? 0,
    sortOrder: p.sortOrder ?? 0,
    isActive: p.isActive !== false,
    outOfStock: p.outOfStock === true,
    tags: p.tags ?? '',
    metaTitle: p.metaTitle ?? '',
    metaDescription: p.metaDescription ?? '',
    createdAt: toDate(p.createdAt),
    updatedAt: toDate(p.updatedAt),
  }
}

function categoryData(c, withParent) {
  return {
    id: c.id,
    name: c.name,
    nameAr: c.nameAr ?? '',
    nameEn: c.nameEn ?? '',
    description: c.description ?? '',
    descriptionAr: c.descriptionAr ?? '',
    descriptionEn: c.descriptionEn ?? '',
    slug: c.slug ?? null,
    parentId: withParent ? c.parentId ?? null : null,
    image: c.image ?? '',
    sortOrder: c.sortOrder ?? 0,
    isActive: c.isActive !== false,
    createdAt: toDate(c.createdAt),
    updatedAt: toDate(c.updatedAt),
  }
}

async function main() {
  if (!file) {
    console.error('المسار مطلوب: node scripts/restore-backup.js <backup.json> [--dry-run]')
    process.exit(1)
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  const t = data.tables || data
  const categories = t.Category || []
  const products = t.Product || []
  const options = t.ProductOption || []
  const variants = t.ProductVariant || []

  if (!products.length) console.warn('تنبيه: لا توجد منتجات في النسخة الاحتياطية.')

  let rolledBack = false
  try {
    await prisma.$transaction(
      async (tx) => {
        // 1) التصنيفات بدون أب أولًا (تفادي قيود المفاتيح الأجنبية)
        for (const c of categories) {
          const d = categoryData(c, false)
          await tx.category.upsert({ where: { id: d.id }, create: d, update: d })
        }
        // 2) ربط التصنيفات الفرعية بآبائها
        for (const c of categories) {
          if (c.parentId) {
            await tx.category.update({ where: { id: c.id }, data: { parentId: c.parentId } })
          }
        }
        // 3) المنتجات
        for (const p of products) {
          const d = productData(p)
          await tx.product.upsert({ where: { id: d.id }, create: d, update: d })
        }
        // 4) الخيارات والمتغيرات
        for (const o of options) {
          const d = { ...o, values: o.values ?? [] }
          await tx.productOption.upsert({ where: { id: d.id }, create: d, update: d })
        }
        for (const v of variants) {
          const d = {
            ...v,
            options: v.options ?? {},
            createdAt: toDate(v.createdAt),
            updatedAt: toDate(v.updatedAt),
          }
          await tx.productVariant.upsert({ where: { id: d.id }, create: d, update: d })
        }

        if (DRY) throw new Error('__DRY_RUN__')
      },
      { timeout: 120000 },
    )
  } catch (e) {
    if (e && e.message === '__DRY_RUN__') {
      rolledBack = true
    } else {
      throw e
    }
  }

  if (DRY) {
    console.log(
      (rolledBack ? 'تمت التجربة بنجاح وتم التراجع. ' : '') +
        'التصنيفات=' + categories.length + ' المنتجات=' + products.length +
        ' الخيارات=' + options.length + ' المتغيرات=' + variants.length,
    )
  } else {
    console.log(
      'تمت الاستعادة: التصنيفات=' + categories.length + ' المنتجات=' + products.length +
        ' الخيارات=' + options.length + ' المتغيرات=' + variants.length,
    )
  }
}

main()
  .catch((e) => {
    console.error('فشلت الاستعادة: ' + (e && e.message ? e.message : e))
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
