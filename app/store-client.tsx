'use client'

import { useMemo, useRef, useState } from 'react'

export type StoreProduct = {
  id: string
  name: string
  nameAr: string
  nameEn: string
  price: string
  salePrice: string
  caption: string
  description: string
  image: string
  images: string[]
  category: string
  categoryId: string
  categoryParentId: string
  stock: number
  outOfStock: boolean
  badge: number
}

export type StoreCategory = {
  id: string
  name: string
  nameAr: string
  nameEn: string
  parentId: string
  image: string
}

const SHOP = {
  name: 'Queen',
  tagline: 'شنط بجودة عالية — توصيل لجميع المناطق',
  phone: '505897949',
  currency: 'ر.س',
}

function wa(message: string) {
  return 'https://wa.me/' + SHOP.phone + '?text=' + encodeURIComponent(message)
}

function srcOf(image: string) {
  if (!image) return ''
  return image.startsWith('data:') || image.startsWith('http') ? image : '/' + image
}

function catName(c: StoreCategory) {
  return c.nameAr || c.name || c.nameEn
}

function effPrice(p: StoreProduct): number {
  const n = parseInt(p.salePrice || p.price, 10)
  return isNaN(n) ? 0 : n
}

function discountPct(p: StoreProduct): number {
  const old = parseInt(p.price, 10)
  const nw = parseInt(p.salePrice, 10)
  if (!isNaN(old) && old > 0 && !isNaN(nw) && nw > 0 && nw < old) {
    return Math.round(((old - nw) / old) * 100)
  }
  return 0
}

export default function StoreClient({
  products,
  categories,
}: {
  products: StoreProduct[]
  categories: StoreCategory[]
}) {
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState<string>('')
  const [sort, setSort] = useState('default')
  const [priceRange, setPriceRange] = useState<[string, string]>(['', ''])
  const [active, setActive] = useState<StoreProduct | null>(null)
  const [mainImg, setMainImg] = useState(0)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mainCats = useMemo(() => categories.filter((c) => !c.parentId), [categories])
  const subCats = useMemo(() => categories.filter((c) => c.parentId), [categories])

  const activeMain = useMemo(() => {
    if (!activeCat) return ''
    const c = categories.find((x) => x.id === activeCat)
    return c ? (c.parentId || c.id) : ''
  }, [activeCat, categories])

  const allowedCatIds = useMemo(() => {
    if (!activeCat) return null
    const ids = new Set<string>([activeCat])
    subCats.forEach((c) => {
      if (c.parentId === activeCat) ids.add(c.id)
    })
    if (activeMain && activeMain !== activeCat) return ids
    return ids
  }, [activeCat, activeMain, subCats])

  const filtered = useMemo(() => {
    const v = query.trim().toLowerCase()
    let list = products.filter((p) => {
      if (allowedCatIds && !allowedCatIds.has(p.categoryId)) return false
      if (v) {
        const hay = (p.name + ' ' + p.nameAr + ' ' + p.nameEn + ' ' + p.caption).toLowerCase()
        if (!hay.includes(v)) return false
      }
      const price = effPrice(p)
      if (priceRange[0] !== '' && price < parseInt(priceRange[0], 10) * 1) return false
      if (priceRange[1] !== '' && price > parseInt(priceRange[1], 10) * 1) return false
      return true
    })

    if (sort === 'newest') {
      list = [...list].reverse()
    } else if (sort === 'price_asc') {
      list = [...list].sort((a, b) => effPrice(a) - effPrice(b))
    } else if (sort === 'price_desc') {
      list = [...list].sort((a, b) => effPrice(b) - effPrice(a))
    } else if (sort === 'name') {
      list = [...list].sort((a, b) => (a.nameAr || a.name).localeCompare(b.nameAr || b.name))
    }
    return list
  }, [products, query, allowedCatIds, sort, priceRange])

  const showToast = (text: string) => {
    setToast(text)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1800)
  }

  const priceLabel = (p: StoreProduct) =>
    p.salePrice && p.salePrice !== p.price ? `${p.salePrice} ${SHOP.currency}` : p.price ? `${p.price} ${SHOP.currency}` : ''

  const captionText = (p: StoreProduct) =>
    priceLabel(p) ? `${p.name} — ${priceLabel(p)}\n${p.caption}` : p.caption

  const copyCaption = async (p: StoreProduct) => {
    const txt = captionText(p)
    try {
      await navigator.clipboard.writeText(txt)
      showToast('تم نسخ الكابشن ✅')
    } catch {
      window.prompt('انسخ الكابشن:', txt)
    }
  }

  const downloadCaptions = () => {
    const txt = filtered
      .map((p) => `${p.name}${p.price ? '\n' + p.price + ' ' + SHOP.currency : ''}\n${p.caption}`)
      .join('\n\n———\n\n')
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'كابشنات-تيك-توك.txt'
    a.click()
    showToast('تم تحميل الكابشنات ✅')
  }

  const chipStyle = (selected: boolean): React.CSSProperties => ({
    border: selected ? '2px solid #111' : '1px solid #ddd',
    background: selected ? '#111' : '#fff',
    color: selected ? '#fff' : '#333',
    borderRadius: '20px',
    padding: '6px 14px',
    fontFamily: 'inherit',
    fontSize: '13px',
    cursor: 'pointer',
  })

  const activeImages = (p: StoreProduct) => {
    const imgs = p.images.filter(Boolean)
    return imgs.length ? imgs : p.image ? [p.image] : []
  }

  const openDetail = (p: StoreProduct) => {
    setActive(p)
    setMainImg(0)
  }

  const applyPrice = (idx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPriceRange((r) => {
      const next: [string, string] = [...r] as [string, string]
      next[idx] = e.target.value
      return next
    })
  }

  return (
    <div className="store" dir="rtl">
      <header>
        <div className="brand">
          <div className="logo">👜</div>
          <div>
            <h1>{SHOP.name}</h1>
            <p>{SHOP.tagline}</p>
          </div>
        </div>
        <div className="tools">
          <input
            type="search"
            placeholder="ابحث عن منتج..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" onClick={downloadCaptions}>📋 الكابشنات</button>
          <a className="admin-link" href="/admin" title="لوحة الإدارة">⚙️ لوحة الإدارة</a>
        </div>
      </header>

      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '8px 16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px' }}>
          <button type="button" style={chipStyle(activeCat === '')} onClick={() => setActiveCat('')}>الكل</button>
          {mainCats.map((c) => (
            <button key={c.id} type="button" style={chipStyle(activeCat === c.id)} onClick={() => setActiveCat(c.id)}>
              {catName(c)}
            </button>
          ))}
        </div>

        {activeMain && activeMain !== activeCat && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#888' }}>التصنيفات الفرعية:</span>
            <button type="button" style={chipStyle(activeCat === activeMain)} onClick={() => setActiveCat(activeMain)}>الكل</button>
            {subCats.filter((c) => c.parentId === activeMain).map((c) => (
              <button key={c.id} type="button" style={chipStyle(activeCat === c.id)} onClick={() => setActiveCat(c.id)}>
                {catName(c)}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
          <label style={{ fontSize: '13px', color: '#555' }}>
            الترتيب:{' '}
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ marginRight: '6px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: 'inherit' }}>
              <option value="default">افتراضي</option>
              <option value="newest">الأحدث</option>
              <option value="price_asc">السعر: من الأقل</option>
              <option value="price_desc">السعر: من الأعلى</option>
              <option value="name">الاسم</option>
            </select>
          </label>
          <label style={{ fontSize: '13px', color: '#555' }}>
            السعر من:{' '}
            <input type="number" min={0} value={priceRange[0]} onChange={applyPrice(0)} style={{ width: '80px', marginRight: '6px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: 'inherit' }} />
          </label>
          <label style={{ fontSize: '13px', color: '#555' }}>
            إلى:{' '}
            <input type="number" min={0} value={priceRange[1]} onChange={applyPrice(1)} style={{ width: '80px', marginRight: '6px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: 'inherit' }} />
          </label>
        </div>
      </div>

      <main className="grid">
        {filtered.map((p) => {
          const disc = discountPct(p)
          return (
            <div className="card" key={p.id}>
              <div className="ph" onClick={() => openDetail(p)}>
                <img src={srcOf(activeImages(p)[0])} alt={p.name} loading="lazy" />
                <span className="badge">{p.badge}</span>
                {disc > 0 && (
                  <span style={{
                    position: 'absolute', top: '10px', left: '10px', background: '#e0234e', color: '#fff',
                    borderRadius: '12px', padding: '2px 8px', fontSize: '12px',
                  }}>
                    -{disc}%
                  </span>
                )}
                {p.outOfStock && (
                  <span style={{
                    position: 'absolute', top: '40px', left: '10px', background: '#888', color: '#fff',
                    borderRadius: '12px', padding: '2px 8px', fontSize: '12px',
                  }}>
                    نفد
                  </span>
                )}
              </div>
              <div className="b-info">
                <div className="b-name">{p.nameAr || p.name}</div>
                <div className="price-row">
                  {p.salePrice && p.salePrice !== p.price && (
                    <span className="old-price" style={{ textDecoration: 'line-through', color: '#999', fontSize: '12px', marginLeft: '6px' }}>{p.price}</span>
                  )}
                  <span className="price">{p.salePrice || p.price}</span>
                  <span className="currency">{SHOP.currency}</span>
                </div>
                {p.category && <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{p.category}</div>}
                <div className="btns">
                  <button type="button" className="copy" onClick={() => copyCaption(p)}>📋 كابشن</button>
                  <a
                    className="wa"
                    href={wa(`السلام عليكم، أبي أطلب ${p.name}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    اطلب
                  </a>
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#888', padding: '40px 0' }}>
            لا توجد منتجات مطابقة. جرّب تغيير الفلاتر أو البحث.
          </div>
        )}
      </main>

      <div className="bar">
        <a
          className="wa"
          href={wa('السلام عليكم، أرغب بالاستفسار عن المنتجات')}
          target="_blank"
          rel="noopener noreferrer"
        >
          📞 اطلب عبر واتساب
        </a>
      </div>

      <div
        className={'lb' + (active ? ' on' : '')}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActive(null)
        }}
      >
        {active && (
          <>
            <button
              type="button"
              onClick={() => setActive(null)}
              style={{ position: 'absolute', top: '14px', right: '14px', zIndex: 3, border: 'none', background: 'rgba(0,0,0,0.55)', color: '#fff', width: '34px', height: '34px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer' }}
            >
              ✕
            </button>
            <div className="lb-inner">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <img src={srcOf(activeImages(active)[mainImg])} alt={active.name} style={{ maxHeight: '50vh', maxWidth: '100%', objectFit: 'contain', borderRadius: '12px' }} />
                {activeImages(active).length > 1 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {activeImages(active).map((im, i) => (
                      <img
                        key={i}
                        src={srcOf(im)}
                        alt=""
                        onClick={() => setMainImg(i)}
                        style={{
                          width: '52px', height: '52px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer',
                          border: i === mainImg ? '3px solid #111' : '2px solid #ddd',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <h3 style={{ margin: '0 0 4px' }}>{active.nameAr || active.name}</h3>
                <div>
                  {active.salePrice && active.salePrice !== active.price && (
                    <span style={{ textDecoration: 'line-through', color: '#999', marginLeft: '8px', fontSize: '15px' }}>{active.price}</span>
                  )}
                  <span style={{ color: '#e0234e', fontWeight: 700, fontSize: '20px' }}>{active.salePrice || active.price}</span>
                  <span style={{ color: '#555', marginRight: '4px' }}>{SHOP.currency}</span>
                </div>
                <p className="cap" style={{ color: '#333', whiteSpace: 'pre-wrap' }}>{active.description || active.caption}</p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
                  <button type="button" className="copy" onClick={() => copyCaption(active)}>📋 نسخ الكابشن</button>
                  <a className="wa" href={wa(`السلام عليكم، أبي أطلب ${active.name}`)} target="_blank" rel="noopener noreferrer">
                    اطلب عبر واتساب
                  </a>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className={'toast' + (toast ? ' on' : '')}>{toast}</div>
    </div>
  )
}