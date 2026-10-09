import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import AdminPanel from './admin-panel'

export default async function AdminPage() {
  const auth = await isAuthenticated()
  if (!auth) {
    redirect('/admin/login')
  }
  return <AdminPanel />
}
