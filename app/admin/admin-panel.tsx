'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Product {
  id: string
  name: string
  nameAr?: string
  nameEn?: string
  slug?: string
  price: string
  salePrice?: string
  color?: string
  caption?: string
  description?: string
  descriptionAr?: string
  descriptionEn?: string
  image: string
  images?: string[]
  category?: string
  categoryId?: string | null
  stock?: number
  sortOrder?: number
  isActive?: boolean
  outOfStock?: boolean
  tags?: string
  metaTitle?: string
  metaDescription?: string
  categoryParentId?: string
}

interface Category {
  id: string
  name: string
  nameAr?: string
  nameEn?: string
  description?: string
  descriptionAr?: string
  descriptionEn?: string
  slug?: string
  parentId?: string | null
  image?: string
  sortOrder?: number
  isActive?: boolean
  _count?: { products?: number; children?: number }
}

const emptyProduct = {
  name: '',
  nameAr: '',
  nameEn: '',
  slug: '',
  price: '',
  salePrice: '',
  color: '',
  caption: '',
  description: '',
  descriptionAr: '',
  descriptionEn: '',
  image: '',
  images: [] as string[],
  category: '',
  categoryId: '',
  stock: 0,
  sortOrder: 0,
  isActive: true,
  outOfStock: false,
  tags: '',
  metaTitle: '',
  metaDescription: '',
}

const emptyCategory = {
  name: '',
  nameAr: '',
  nameEn: '',
  description: '',
  descriptionAr: '',
  descriptionEn: '',
  slug: '',
  parentId: '',
  image: '',
  sortOrder: 0,
  isActive: true,
}

const FONT = 'Cairo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
const inputStyle: React.CSSProperties = { padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: FONT }
const btnDark: React.CSSProperties = { padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#111', color: '#fff', fontFamily: FONT, cursor: 'pointer' }
const btnLight: React.CSSProperties = { padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', color: '#333', fontFamily: FONT, cursor: 'pointer' }

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
  const [tab, setTab] = useState<'products' | 'categories'>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyProduct)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [catForm, setCatForm] = useState(emptyCategory)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showCatForm, setShowCatForm] = useState(false)
  const [busy, setBusy] = useState(false)
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
      const res = await fetch('/api/categories?includeInactive=true', { cache: 'no-store' })
      if (res.ok) setCategories(await res.json())
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [])

  const reloadAll = async () => {
    await Promise.all([loadProducts(), loadCategories()])
    router.refresh()
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  const catName = (c: Category) => c.nameAr || c.name
  const catById = (id?: string | null) => categories.find((c) => c.id === id)

  const mainCats = useMemo(() => categories.filter((c) => !c.parentId), [categories])
  const childCats = useMemo(() => categories.filter((c) => c.parentId), [categories])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...emptyProduct, sortOrder: products.length + 1 })
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      ...emptyProduct,
      ...p,
      images: Array.isArray(p.images) ? p.images : p.image ? [p.image] : [],
      categoryId: p.categoryId || '',
      stock: p.stock ?? 0,
      sortOrder: p.sortOrder ?? 0,
      isActive: p.isActive !== false,
      outOfStock: !!p.outOfStock,
    })
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const handleUploadMultiple = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    if (!files.length) return
    setUploading(true)
    setError('')
    setSuccess('')
    try {
      const urls: string[] = []
      for (const file of files) {
        const compressed = await compressImage(file)
        const fd = new FormData()
        fd.append('file', new File([compressed], 'upload.jpg', { type: compressed.type || 'image/jpeg' }))
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.url) urls.push(data.url)
      }
      if (urls.length) {
        setForm((f) => ({ ...f, images: [...f.images, ...urls] }))
        setSuccess(`تم رفع ${urls.length} صورة بنجاح`)
      } else {
        setError('فشل رفع الصور')
      }
    } catch {
      setError('فشل رفع الصور')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removeImage = (url: string) => {
    setForm((f) => ({ ...f, images: f.images.filter((x) => x !== url) }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const payload = {
        ...form,
        images: form.images,
        categoryId: form.categoryId || undefined,
        category: form.category,
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
      await reloadAll()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف المنتج؟')) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('فشل حذف المنتج')
      setSuccess('تم حذف المنتج')
      await reloadAll()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (p: Product) => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !p.isActive }),
      })
      if (!res.ok) throw new Error('فشل تحديث حالة المنتج')
      await reloadAll()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const toggleCatActive = async (c: Category) => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/categories/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !c.isActive }),
      })
      if (!res.ok) throw new Error('فشل تحديث حالة التصنيف')
      await reloadAll()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const openAddCat = (parentId?: string) => {
    setEditingCat(null)
    setCatForm({ ...emptyCategory, sortOrder: categories.length + 1, parentId: parentId || '' })
    setShowCatForm(true)
    setError('')
    setSuccess('')
  }

  const openEditCat = (c: Category) => {
    setEditingCat(c)
    setCatForm({
      ...emptyCategory,
      ...c,
      parentId: c.parentId || '',
      sortOrder: c.sortOrder ?? 0,
      isActive: c.isActive !== false,
    })
    setShowCatForm(true)
    setError('')
    setSuccess('')
  }

  const handleCatUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const compressed = await compressImage(file)
      const fd = new FormData()
      fd.append('file', new File([compressed], 'upload.jpg', { type: compressed.type || 'image/jpeg' }))
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) {
        setCatForm((f) => ({ ...f, image: data.url }))
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

  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const payload = { ...catForm }
      const res = editingCat
        ? await fetch(`/api/categories/${editingCat.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'فشل حفظ التصنيف')
      setSuccess(editingCat ? 'تم تحديث التصنيف بنجاح' : 'تمت إضافة التصنيف بنجاح')
      setShowCatForm(false)
      await reloadAll()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const deleteCategory = async (c: Category) => {
    const list = [c.name, ...childCats.filter((x) => x.parentId === c.id).map(catName)].join('، ')
    if (!confirm(`حذف التصنيف "${catName(c)}"؟\n${c._count?.products || 0} منتج مرتبط.\nلا يمكن الحذف إن كان للتصنيف أبناء أو منتجات مرتبطة.`)) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/categories/${c.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'فشل حذف التصنيف')
      setSuccess('تم حذف التصنيف')
      await reloadAll()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const imgSrc = (image: string) => (image.startsWith('data:') || image.startsWith('http') ? image : '/' + image)

  const listStyle: React.CSSProperties = { padding: '10px 12px', border: '1px solid #eee', borderRadius: '10px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', background: '#fff' }

  return (
    <div dir="rtl" style={{ fontFamily: FONT, background: '#f9f9f9', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>لوحة إدارة Queen Store</h1>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => setTab('products')} style={{ ...btnLight, background: tab === 'products' ? '#111' : '#fff', color: tab === 'products' ? '#fff' : '#333' }}>المنتجات</button>
            <button onClick={() => setTab('categories')} style={{ ...btnLight, background: tab === 'categories' ? '#111' : '#fff', color: tab === 'categories' ? '#fff' : '#333' }}>التصنيفات</button>
            <a href="/" style={{ ...btnLight, textDecoration: 'none', fontSize: '14px' }}>عرض المتجر</a>
            <button onClick={handleLogout} style={btnLight}>تسجيل الخروج</button>
          </div>
        </header>

        {error && <div style={{ background: '#fee', color: '#d33', padding: '10px 12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}
        {success && <div style={{ background: '#efe', color: '#2a7a2a', padding: '10px 12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{success}</div>}

        {tab === 'categories' ? (
          <>
            <div style={{ marginBottom: '16px' }}>
              <button onClick={() => openAddCat()} style={btnDark}>إضافة تصنيف رئيسي</button>
            </div>

            {mainCats.map((cat) => {
              const kids = childCats.filter((c) => c.parentId === cat.id)
              return (
                <div key={cat.id} style={{ marginBottom: '12px' }}>
                  <div style={listStyle}>
                    {cat.image && <img src={imgSrc(cat.image)} alt="" style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '8px' }} />}
                    <div style={{ flex: '1' }}>
                      <strong>{catName(cat)}</strong>
                      <span style={{ fontSize: '12px', color: '#888', marginRight: '8px' }}>
                        {cat._count?.products || 0} منتج • {cat._count?.children || 0} فرعي
                        {cat.isActive ? '' : ' • مخفي'}
                      </span>
                    </div>
                    <button type="button" style={btnLight} onClick={() => openAddCat(cat.id)}>إضافة فرعي</button>
                    <button type="button" style={btnLight} onClick={() => openEditCat(cat)}>تعديل</button>
                    <button type="button" style={btnLight} onClick={() => toggleCatActive(cat)}>{cat.isActive ? 'إخفاء' : 'إظهار'}</button>
                    <button type="button" style={{ ...btnLight, color: '#d33' }} onClick={() => deleteCategory(cat)} disabled={busy}>حذف</button>
                  </div>
                  {kids.map((kid) => (
                    <div key={kid.id} style={{ ...listStyle, marginRight: '36px' }}>
                      <span style={{ color: '#aaa', fontSize: '12px' }}>⌄</span>
                      {kid.image && <img src={imgSrc(kid.image)} alt="" style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '8px' }} />}
                      <div style={{ flex: '1' }}>
                        <strong>{catName(kid)}</strong>
                        <span style={{ fontSize: '12px', color: '#888', marginRight: '8px' }}>
                          {kid._count?.products || 0} منتج{kid.isActive ? '' : ' • مخفي'}
                        </span>
                      </div>
                      <button type="button" style={btnLight} onClick={() => openEditCat(kid)}>تعديل</button>
                      <button type="button" style={btnLight} onClick={() => toggleCatActive(kid)}>{kid.isActive ? 'إخفاء' : 'إظهار'}</button>
                      <button type="button" style={{ ...btnLight, color: '#d33' }} onClick={() => deleteCategory(kid)} disabled={busy}>حذف</button>
                    </div>
                  ))}
                </div>
              )
            })}
            {categories.length === 0 && <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', textAlign: 'center', color: '#888' }}>لا توجد تصنيفات بعد. أضف تصنيفاً رئيسياً أولاً ثم أضف له تصنيفات فرعية.</div>}

            {showCatForm && (
              <form onSubmit={handleSaveCat} style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
                <h2 style={{ margin: '0 0 16px', fontSize: '18px' }}>{editingCat ? 'تعديل تصنيف' : 'إضافة تصنيف'}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <input placeholder="اسم التصنيف (عربي)" value={catForm.nameAr} onChange={(e) => setCatForm({ ...catForm, nameAr: e.target.value })} style={inputStyle} />
                  <input placeholder="اسم التصنيف (افتراضي)" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} style={inputStyle} />
                  <input placeholder="اسم التصنيف (إنجليزي)" value={catForm.nameEn} onChange={(e) => setCatForm({ ...catForm, nameEn: e.target.value })} style={inputStyle} />
                  <input placeholder="معرّف الرابط (slug)" value={catForm.slug} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })} style={inputStyle} />
                  <select value={catForm.parentId} onChange={(e) => setCatForm({ ...catForm, parentId: e.target.value })} style={inputStyle}>
                    <option value="">تصنيف رئيسي</option>
                    {mainCats.filter((c) => c.id !== editingCat?.id).map((c) => <option key={c.id} value={c.id}>{catName(c)}</option>)}
                  </select>
                  <input placeholder="ترتيب العرض" type="number" min={0} value={catForm.sortOrder} onChange={(e) => setCatForm({ ...catForm, sortOrder: parseInt(e.target.value) || 0 })} style={inputStyle} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={catForm.isActive} onChange={(e) => setCatForm({ ...catForm, isActive: e.target.checked })} />
                    <span>التصنيف نشط</span>
                  </label>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <textarea placeholder="وصف التصنيف (عربي)" value={catForm.descriptionAr} onChange={(e) => setCatForm({ ...catForm, descriptionAr: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: FONT, minHeight: '60px' }} />
                </div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="file" accept="image/*" onChange={handleCatUpload} disabled={uploading} />
                  {uploading && <span style={{ fontSize: '13px', color: '#666' }}>جاري الرفع...</span>}
                  <input placeholder="رابط صورة التصنيف" value={catForm.image} onChange={(e) => setCatForm({ ...catForm, image: e.target.value })} style={{ ...inputStyle, flex: '1 1 200px' }} />
                  {catForm.image && <img src={imgSrc(catForm.image)} alt="preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />}
                </div>
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                  <button type="submit" disabled={busy} style={btnDark}>حفظ</button>
                  <button type="button" onClick={() => setShowCatForm(false)} style={btnLight}>إلغاء</button>
                </div>
              </form>
            )}
          </>
        ) : (
          <>
            {showForm && (
              <form onSubmit={handleSave} style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
                <h2 style={{ margin: '0 0 16px', fontSize: '18px' }}>{editing ? 'تعديل منتج' : 'إضافة منتج'}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <input placeholder="اسم المنتج (عربي) *" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} style={inputStyle} />
                  <input placeholder="اسم المنتج (افتراضي) *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
                  <input placeholder="اسم المنتج (إنجليزي)" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} style={inputStyle} />
                  <input placeholder="معرّف الرابط (slug)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} style={inputStyle} />
                  <input placeholder="السعر *" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={inputStyle} />
                  <input placeholder="سعر الخصم (اختياري)" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} style={inputStyle} />
                  <input placeholder="اللون" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} style={inputStyle} />
                  <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} style={inputStyle}>
                    <option value="">بدون تصنيف</option>
                    {mainCats.map((c) => (
                      <optgroup key={c.id} label={catName(c)}>
                        <option value={c.id}>{catName(c)}</option>
                        {childCats.filter((cd) => cd.parentId === c.id).map((cd) => <option key={cd.id} value={cd.id}>↳ {catName(cd)}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <input placeholder="المخزون" type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} style={inputStyle} />
                  <input placeholder="ترتيب العرض" type="number" min={0} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} style={inputStyle} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                    <span>نشط</span>
                    <input type="checkbox" checked={form.outOfStock} onChange={(e) => setForm({ ...form, outOfStock: e.target.checked })} />
                    <span>نفد المخزون</span>
                  </label>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <textarea placeholder="وصف قصير (عربي)" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: FONT, minHeight: '60px' }} />
                </div>
                <div style={{ marginTop: '12px' }}>
                  <textarea placeholder="وصف مفصل (عربي)" value={form.descriptionAr} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: FONT, minHeight: '60px' }} />
                </div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="file" accept="image/*" multiple onChange={handleUploadMultiple} disabled={uploading} />
                  {uploading && <span style={{ fontSize: '13px', color: '#666' }}>جاري الرفع...</span>}
                  <input placeholder="رابط صورة رئيسية" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} style={{ ...inputStyle, flex: '1 1 200px' }} />
                </div>
                {form.images.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {form.images.map((im, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <img src={imgSrc(im)} alt="" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', border: i === 0 ? '3px solid #e0234e' : '1px solid #ddd' }} />
                        <button type="button" onClick={() => removeImage(im)} style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', border: 'none', background: '#d33', color: '#fff', fontSize: '12px', lineHeight: '1', cursor: 'pointer' }}>✕</button>
                        {i === 0 && <span style={{ position: 'absolute', bottom: '-6px', right: '0', background: '#e0234e', color: '#fff', fontSize: '10px', borderRadius: '6px', padding: '0 4px' }}>الأولى</span>}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: '12px' }}>
                  <input placeholder="وسوم (comma separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} style={{ ...inputStyle, width: '100%' }} />
                </div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input placeholder="عنوان SEO" value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} style={{ ...inputStyle, flex: '1 1 240px' }} />
                  <input placeholder="وصف SEO" value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} style={{ ...inputStyle, flex: '1 1 240px' }} />
                </div>
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                  <button type="submit" disabled={busy} style={btnDark}>حفظ</button>
                  <button type="button" onClick={() => setShowForm(false)} style={btnLight}>إلغاء</button>
                </div>
              </form>
            )}

            <div style={{ marginBottom: '16px' }}>
              <button onClick={openAdd} style={btnDark}>إضافة منتج جديد</button>
            </div>

            <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '820px' }}>
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
                      <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>
                        <div>{p.nameAr || p.name}</div>
                        {p.salePrice && <div style={{ fontSize: '12px', color: '#e0234e' }}>خصم: {p.salePrice}</div>}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>{catName(catById(p.categoryId) || { id: '', name: p.category || '' })}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>
                        {p.salePrice && p.salePrice !== p.price ? <span><s>{p.price}</s> {p.salePrice}</span> : p.price}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>
                        {p.outOfStock ? 'نفد' : p.stock}
                      </td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>{p.isActive ? 'نشط' : 'مخفي'}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5' }}>{p.sortOrder}</td>
                      <td style={{ padding: '10px', borderBottom: '1px solid #f5f5f5', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button onClick={() => openEdit(p)} style={btnLight}>تعديل</button>
                        <button onClick={() => toggleActive(p)} style={btnLight}>{p.isActive ? 'إخفاء' : 'إظهار'}</button>
                        <button onClick={() => handleDelete(p.id)} style={{ ...btnLight, color: '#d33' }}>حذف</button>
                      </td>
                    </tr>
                  ))}
                  {!loading && products.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>لا توجد منتجات. اضغط «إضافة منتج جديد».</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}