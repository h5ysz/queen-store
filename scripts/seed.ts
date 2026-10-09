import { db } from '../lib/db'
import { SEED_PRODUCTS } from '../lib/products-seed'

async function main() {
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
    console.log('Seeded 23 products')
  } else {
    console.log('Products already exist, skipping seed')
  }
}

main()
  .then(async () => {
    await db.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })
