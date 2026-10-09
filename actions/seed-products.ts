'use server'

import { db } from '@/lib/db'
import { SEED_PRODUCTS } from '@/lib/products-seed'
import { isAuthenticated } from '@/lib/auth'

export async function seedProductsAction() {
  const auth = await isAuthenticated()
  if (!auth) {
    return { error: 'غير مصرح', seeded: false, count: 0 }
  }
  const count = await db.product.count()
  if (count === 0) {
    await db.product.createMany({
      data: SEED_PRODUCTS.map((p) => ({
        name: p.name,
        price: p.price,
        color: p.color,
        caption: p.caption,
        image: p.image,
        sortOrder: p.sortOrder,
        isActive: p.isActive,
      })),
    })
    return { seeded: true, count: 23 }
  }
  return { seeded: false, count }
}
