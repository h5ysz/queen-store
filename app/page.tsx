import { db } from '@/lib/db'
import StoreClient from './store-client'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
    db.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
  ])

  const items = products.map((p, i) => ({
    id: p.id,
    name: p.name,
    nameAr: p.nameAr || '',
    nameEn: p.nameEn || '',
    price: p.price,
    salePrice: p.salePrice || '',
    caption: p.caption,
    description: p.description || p.caption,
    image: p.image,
    images: Array.isArray(p.images) ? (p.images as unknown[]).filter((x) => typeof x === 'string') : [],
    category: p.category,
    categoryId: p.categoryId || '',
    categoryParentId: '',
    stock: p.stock ?? 0,
    outOfStock: p.outOfStock || (p.stock !== undefined && p.stock <= 0),
    badge: i + 1,
  }))

  const cats = categories.map((c) => ({
    id: c.id,
    name: c.name,
    nameAr: c.nameAr || '',
    nameEn: c.nameEn || '',
    parentId: c.parentId || '',
    image: c.image || '',
  }))

  const parentById = new Map<string, string>()
  cats.forEach((c) => {
    if (c.parentId) parentById.set(c.id, c.parentId)
  })
  items.forEach((p) => {
    p.categoryParentId = parentById.get(p.categoryId) || ''
  })

  return <StoreClient products={items} categories={cats} />
}