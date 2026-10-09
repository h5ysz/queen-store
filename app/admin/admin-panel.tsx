'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Product {
  id: string
  name: string
  price: string
  color: string
  caption: string
  image: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const emptyProduct: Partial<Product> = {
  name: '',
  price: '',
  color: '',
  caption: '',
  image: '',
  sortOrder: 0,
  isActive: true,
}

export default function AdminPanel() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<Partial<Product>>(emptyProduct)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const router = useRouter()

  const loadProducts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/products?includeInactive=true', { cache: 'no-store' })
      if (!res.ok) throw new Error('فشل تحميل المنتجات')
      const data = await res.json()
      setProducts(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  const openAdd = () => {
    setEditing(null)
    setForm({ ...emptyProduct, sortOrder: products.length + 1 })
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({ ...p })
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        setForm((f) => ({ ...f, image: data.url }))
        setSuccess('تم رفع الصورة بنجاح')
      } else {
        setError(data.error || 'فشل رفع الصورة')
      }
    } catch {
      setError('فشل رفع الصورة')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      if (editing) {
        const res = await fetch(`/api/products/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error('فشل تحديث المنتج')
        setSuccess('تم تحديث المنتج بنجاح')
      } else {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error('فشل إضافة المنتج')
        setSuccess('تم إضافة المنتج بنجاح')
      }
      setShowForm(false)
      await loadProducts()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف المنتج؟')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('فشل حذف المنتج')
      await loadProducts()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (p: Product) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !p.isActive }),
      })
      if (!res.ok) throw new Error('فشل تحديث حالة المنتج')
      await loadProducts()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', background: '#f9f9f9', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>لوحة إدارة المنتجات</h1>
          <div>
            <button onClick={openAdd} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#111', color: '#fff', fontFamily: 'Cairo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', marginLeft: '8px', cursor: 'pointer' }}>إضافة منتج جديد</button>
            <a href="/" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', color: '#333', textDecoration: 'none', marginLeft: '8px', fontSize: '14px' }}>عرض المتجر</a>
            <button onClick={handleLogout} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', color: '#333', fontFamily: 'Cairo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', cursor: 'pointer' }}>تسجيل الخروج</button>
          </div>
        </header>

        {error && <div style={{ background: '#fee', color: '#d33', padding: '10px 12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}
        {success && <div style={{ background: '#efe', color: '#2a7a2a', padding: '10px 12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{success}</div>}

        {showForm && (
          <form onSubmit={handleSave} style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '24px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px' }}>{editing ? 'تعديل منتج' : 'إضافة منتج'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              <input placeholder="اسم المنتج" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: 'Cairo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }} />
              <input placeholder="السعر" value={form.price || ''} onChange={(e) => setForm({ ...form, price: e.target.value })} required style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: 'Cairo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }} />
              <input placeholder="اللون" value={form.color || ''} onChange={(e) => setForm({ ...form, color: e.target.value })} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: 'Cairo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }} />
              <input placeholder="ترتيب العرض" type="number" value={form.sortOrder || 0} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: 'Cairo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }} />
              <input placeholder="رابط الصورة" value={form.image || ''} onChange={(e) => setForm({ ...form, image: e.target.value })} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: 'Cairo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={form.isActive !== false} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                <span>المنتج نشط</span>
              </label>
            </div>
            <div style={{ marginTop: '12px' }}>
              <textarea placeholder="وصف المنتج" value={form.caption || ''} onChange={(e) => setForm({ ...form, caption: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: 'Cairo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', minHeight: '80px' }} />
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
              {uploading && <span style={{ fontSize: '13px', color: '#666' }}>جاري الرفع...</span>}
              {form.image && <img src={form.image.startsWith('data:') ? form.image : (form.image.startsWith('http') ? form.image : '/' + form.image)} alt="preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />}
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <button type="submit" disabled={loading} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#111', color: '#fff', fontFamily: 'Cairo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', cursor: loading ? 'not-allowed' : 'pointer' }}>حفظ</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', color: '#333', fontFamily: 'Cairo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', cursor: 'pointer' }}>إلغاء</button>
            </div>
          </form>
        )}

        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>الصورة</th>
                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>الاسم</th>
                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>السعر</th>
                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>اللون</th>
                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>حالة المنتج</th>
                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>ترتيب العرض</th>
                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>
                    <img src={p.image.startsWith('data:') ? p.image : (p.image.startsWith('http') ? p.image : '/' + p.image)} alt={p.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px' }} />
                  </td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>{p.name}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>{p.price}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>{p.color}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>{p.isActive ? 'نشط' : 'مخفي'}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>{p.sortOrder}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button onClick={() => openEdit(p)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', fontFamily: 'Cairo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', fontSize: '12px', cursor: 'pointer' }}>تعديل</button>
                    <button onClick={() => toggleActive(p)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', fontFamily: 'Cairo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', fontSize: '12px', cursor: 'pointer' }}>{p.isActive ? 'إخفاء' : 'إظهار'}</button>
                    <button onClick={() => handleDelete(p.id)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', color: '#d33', fontFamily: 'Cairo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', fontSize: '12px', cursor: 'pointer' }}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
