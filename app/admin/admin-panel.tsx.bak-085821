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
  category: string
  stock: number
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface Category {
  id: string
  name: string
  sortOrder: number
}

const emptyProduct: Partial<Product> = {
  name: '',
  price: '',
  color: '',
  caption: '',
  image: '',
  category: '',
  stock: 0,
  sortOrder: 0,
  isActive: true,
}

const FONT = 'Cairo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
const inputStyle: React.CSSProperties = { padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: FONT }

async function compressImage(file: File): Promise<Blob> {
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('read'))
      reader.readAsDataURL(file)
    })
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image()
      im.onload = () => resolve(im)
      im.onerror = () => reject(new Error('img'))
      im.src = dataUrl
    })
    const maxDim = 1200
    let width = img.naturalWidth || img.width
    let height = img.naturalHeight || img.height
    if (!width || !height) return file
    if (width > maxDim || height > maxDim) {
      const scale = Math.min(maxDim / width, maxDim / height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.82))
    return blob || file
  } catch {
    return file
  }
}

export default function AdminPanel() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<Partial<Product>>(emptyProduct)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [categoryBusy, setCategoryBusy] = useState(false)
  const router = useRouter()

  const loadProducts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/products?includeInactive=true', { cache: 'no-store' })
      if (!res.ok) throw new Error('فشل تحميل المنتجات')
      setProducts(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/categories', { cache: 'no-store' })
      if (res.ok) setCategories(await res.json())
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadProducts()
    loadCategories()
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
    setSuccess('')
    try {
      const compressed = await compressImage(file)
      const fd = new FormData()
      fd.append('file', new File([compressed], 'upload.jpg', { type: compressed.type || 'image/jpeg' }))
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) {
        setForm((f) => ({ ...f, image: data.url }))
        setSuccess('تم رفع الصورة بنجاح')
      } else {
        setError(data.error || 'فشل رفع الصورة')
      }
    } catch {
      setError('فشل رفع الصورة')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const payload = {
        name: form.name,
        price: form.price,
        color: form.color,
        caption: form.caption,
        image: form.image,
        category: form.category,
        stock: form.stock ?? 0,
        sortOrder: form.sortOrder ?? 0,
        isActive: form.isActive !== false,
      }
      const res = editing
        ? await fetch(`/api/products/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || (editing ? 'فشل تحديث المنتج' : 'فشل إضافة المنتج'))
      setSuccess(editing ? 'تم تحديث المنتج بنجاح' : 'تمت إضافة المنتج بنجاح')
      setShowForm(false)
      await loadProducts()
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف المنتج؟')) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('فشل حذف المنتج')
      setSuccess('تم حذف المنتج')
      await loadProducts()
      router.refresh()
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
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const addCategory = async () => {
    const name = newCategory.trim()
    if (!name) return
    setCategoryBusy(true)
    setError('')
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, sortOrder: categories.length + 1 }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'فشل إضافة التصنيف')
      setNewCategory('')
      setSuccess('تم إضافة التصنيف')
      await loadCategories()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCategoryBusy(false)
    }
  }

  const renameCategory = async (cat: Category) => {
    const name = prompt('الاسم الجديد للتصنيف:', cat.name)
    if (name === null) return
    const trimmed = name.trim()
    if (!trimmed || trimmed === cat.name) return
    setCategoryBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'فشل تعديل التصنيف')
      setSuccess('تم تعديل التصنيف')
      await Promise.all([loadCategories(), loadProducts()])
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCategoryBusy(false)
    }
  }

  const deleteCategory = async (cat: Category) => {
    if (!confirm(`حذف التصنيف "${cat.name}"؟ ستُزال هذه التصنيفات من المنتجات المرتبطة.`)) return
    setCategoryBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'فشل حذف التصنيف')
      setSuccess('تم حذف التصنيف')
      await Promise.all([loadCategories(), loadProducts()])
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCategoryBusy(false)
    }
  }

  const imgSrc = (image: string) => (image.startsWith('data:') || image.startsWith('http') ? image : '/' + image)

  return (
    <div dir="rtl" style={{ fontFamily: FONT, background: '#f9f9f9', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>لوحة إدارة Queen Store</h1>
          <div>
            <button onClick={openAdd} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#111', color: '#fff', fontFamily: FONT, marginLeft: '8px', cursor: 'pointer' }}>إضافة منتج جديد</button>
            <a href="/" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', color: '#333', textDecoration: 'none', marginLeft: '8px', fontSize: '14px' }}>عرض المتجر</a>
            <button onClick={handleLogout} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', color: '#333', fontFamily: FONT, cursor: 'pointer' }}>تسجيل الخروج</button>
          </div>
        </header>

        {error && <div style={{ background: '#fee', color: '#d33', padding: '10px 12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}
        {success && <div style={{ background: '#efe', color: '#2a7a2a', padding: '10px 12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{success}</div>}

        <section style={{ background: '#fff', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '18px' }}>إدارة التصنيفات</h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <input
              placeholder="اسم تصنيف جديد"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }}
              style={{ ...inputStyle, flex: '1 1 220px' }}
            />
            <button type="button" onClick={addCategory} disabled={categoryBusy} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#111', color: '#fff', fontFamily: FONT, cursor: categoryBusy ? 'not-allowed' : 'pointer' }}>إضافة تصنيف</button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {categories.length === 0 && <span style={{ color: '#888', fontSize: '13px' }}>لا توجد تصنيفات بعد.</span>}
            {categories.map((cat) => (
              <span key={cat.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #ddd', borderRadius: '20px', padding: '4px 6px 4px 12px', fontSize: '13px', background: '#fafafa' }}>
                {cat.name}
                <button type="button" onClick={() => renameCategory(cat)} disabled={categoryBusy} title="تعديل" style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px' }}>✏️</button>
                <button type="button" onClick={() => deleteCategory(cat)} disabled={categoryBusy} title="حذف" style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#d33' }}>✕</button>
              </span>
            ))}
          </div>
        </section>

        {showForm && (
          <form onSubmit={handleSave} style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '24px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px' }}>{editing ? 'تعديل منتج' : 'إضافة منتج'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              <input placeholder="اسم المنتج" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={inputStyle} />
              <input placeholder="السعر" value={form.price || ''} onChange={(e) => setForm({ ...form, price: e.target.value })} style={inputStyle} />
              <input placeholder="اللون" value={form.color || ''} onChange={(e) => setForm({ ...form, color: e.target.value })} style={inputStyle} />
              <input list="category-options" placeholder="التصنيف" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputStyle} />
              <datalist id="category-options">
                {categories.map((c) => <option key={c.id} value={c.name} />)}
              </datalist>
              <input placeholder="المخزون" type="number" min={0} value={form.stock ?? 0} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} style={inputStyle} />
              <input placeholder="ترتيب العرض" type="number" value={form.sortOrder ?? 0} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} style={inputStyle} />
              <input placeholder="رابط الصورة" value={form.image || ''} onChange={(e) => setForm({ ...form, image: e.target.value })} style={inputStyle} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={form.isActive !== false} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                <span>المنتج نشط</span>
              </label>
            </div>
            <div style={{ marginTop: '12px' }}>
              <textarea placeholder="وصف المنتج" value={form.caption || ''} onChange={(e) => setForm({ ...form, caption: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: FONT, minHeight: '80px' }} />
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
              {uploading && <span style={{ fontSize: '13px', color: '#666' }}>جاري الرفع...</span>}
              {form.image && <img src={imgSrc(form.image)} alt="preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />}
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <button type="submit" disabled={loading} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#111', color: '#fff', fontFamily: FONT, cursor: loading ? 'not-allowed' : 'pointer' }}>حفظ</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', color: '#333', fontFamily: FONT, cursor: 'pointer' }}>إلغاء</button>
            </div>
          </form>
        )}

        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>الصورة</th>
                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>الاسم</th>
                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>التصنيف</th>
                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>السعر</th>
                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>المخزون</th>
                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>الحالة</th>
                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>الترتيب</th>
                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>
                    <img src={imgSrc(p.image)} alt={p.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px' }} />
                  </td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>{p.name}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>{p.category || '—'}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>{p.price}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>{p.stock}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>{p.isActive ? 'نشط' : 'مخفي'}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>{p.sortOrder}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button onClick={() => openEdit(p)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', fontFamily: FONT, fontSize: '12px', cursor: 'pointer' }}>تعديل</button>
                    <button onClick={() => toggleActive(p)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', fontFamily: FONT, fontSize: '12px', cursor: 'pointer' }}>{p.isActive ? 'إخفاء' : 'إظهار'}</button>
                    <button onClick={() => handleDelete(p.id)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', color: '#d33', fontFamily: FONT, fontSize: '12px', cursor: 'pointer' }}>حذف</button>
                  </td>
                </tr>
              ))}
              {!loading && products.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>لا توجد منتجات. اضغط «إضافة منتج جديد».</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
