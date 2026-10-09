import { redirect } from 'next/navigation'
import { seedProductsAction } from '@/actions/seed-products'
import { db } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'

export default async function SeedPage() {
  const auth = await isAuthenticated()
  if (!auth) {
    redirect('/admin/login')
  }
  const result = await seedProductsAction()
  const count = await db.product.count().catch(() => result.count ?? 0)

  return (
    <div dir='rtl' style={{ fontFamily: 'Cairo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', padding: '24px' }}>
      <h1>تهيئة المنتجات</h1>
      <p>{result.seeded ? 'تم نقل المنتجات (23 منتج) إلى قاعدة البيانات بنجاح.' : result.error ? result.error : 'المنتجات موجودة مسبقاً في قاعدة البيانات.'}</p>
      <p>عدد المنتجات حالياً: {count}</p>
      <a href='/' style={{ color: '#111' }}>العودة للمتجر</a>
    </div>
  )
}
