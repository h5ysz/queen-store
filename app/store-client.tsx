'use client'

import { useMemo, useRef, useState } from 'react'

export type StoreProduct = {
  id: string
  name: string
  price: string
  caption: string
  image: string
  badge: number
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
  return image.startsWith('data:') || image.startsWith('http') ? image : '/' + image
}

export default function StoreClient({ products }: { products: StoreProduct[] }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<StoreProduct | null>(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filtered = useMemo(() => {
    const v = query.trim()
    return v ? products.filter((p) => p.name.includes(v)) : products
  }, [query, products])

  const showToast = (text: string) => {
    setToast(text)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1800)
  }

  const captionText = (p: StoreProduct) =>
    p.price ? `${p.name} — ${p.price} ${SHOP.currency}\n${p.caption}` : p.caption

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
    const txt = products
      .map((p) => `${p.name}${p.price ? ' — ' + p.price + ' ' + SHOP.currency : ''}\n${p.caption}`)
      .join('\n\n———\n\n')
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'كابشنات-تيك-توك.txt'
    a.click()
    showToast('تم تحميل الكابشنات ✅')
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
        </div>
      </header>

      <main className="grid">
        {filtered.map((p) => (
          <div className="card" key={p.id}>
            <div className="ph" onClick={() => setActive(p)}>
              <img src={srcOf(p.image)} alt={p.name} loading="lazy" />
              <span className="badge">{p.badge}</span>
            </div>
            <div className="b-info">
              <div className="b-name">{p.name}</div>
              <div className="price-row">
                <span className="price">{p.price}</span>
                <span className="currency">{SHOP.currency}</span>
              </div>
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
        ))}
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
        <button type="button" onClick={() => setActive(null)}>✕</button>
        <div className="lb-inner">
          <img src={active ? srcOf(active.image) : ''} alt={active ? active.name : ''} />
          <p className="cap">{active ? active.caption : ''}</p>
        </div>
      </div>

      <div className={'toast' + (toast ? ' on' : '')}>{toast}</div>
    </div>
  )
}
