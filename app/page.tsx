import { db } from '@/lib/db'
import StoreClient from './store-client'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const products = await db.product.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })

  const items = products.map((p, i) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    caption: p.caption,
    image: p.image,
    badge: i + 1,
  }))

  return <StoreClient products={items} />
}
