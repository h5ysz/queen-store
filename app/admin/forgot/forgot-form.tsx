'use client'

import { useState } from 'react'

const font = 'Cairo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'

export default function ForgotForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'تعذّر الإرسال، حاول لاحقًا.')
      }
    } catch {
      setError('حدث خطأ ما')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font }}>
      <div style={{ background: '#fff', padding: '32px 24px', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', width: '100%', maxWidth: '380px' }}>
        <h1 style={{ textAlign: 'center', margin: '0 0 16px', fontSize: '22px', color: '#333' }}>نسيت كلمة المرور</h1>

        {sent ? (
          <div style={{ background: '#f0f7f0', border: '1px solid #cfe6cf', color: '#2e6b2e', padding: '12px 14px', borderRadius: '8px', fontSize: '13px', lineHeight: 1.8 }}>
            إذا كان البريد مسجّلًا لدينا، فسيصلك رابط لإعادة تعيين كلمة المرور خلال دقائق. تحقّق من صندوق الوارد والبريد غير المرغوب.
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#666', lineHeight: 1.7 }}>
              أدخل البريد الإلكتروني المرتبط بحساب المدير، وسنرسل لك رابط إعادة التعيين.
            </p>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333' }}>البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: font, fontSize: '14px', boxSizing: 'border-box' }}
              placeholder="example@email.com"
              required
            />
            {error && <div style={{ color: '#d33', marginTop: '10px', fontSize: '13px' }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '18px', padding: '10px 12px', borderRadius: '8px', border: 'none', background: '#111', color: '#fff', fontFamily: font, fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
          <a href="/admin/login" style={{ color: '#666', textDecoration: 'none' }}>العودة لتسجيل الدخول</a>
        </div>
      </div>
    </div>
  )
}
