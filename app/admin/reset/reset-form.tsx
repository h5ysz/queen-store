'use client'

import { useState } from 'react'

const font = 'Cairo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'

export default function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const invalidLink = !token

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل.')
      return
    }
    if (password !== confirm) {
      setError('كلمتا المرور غير متطابقتين.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirm }),
      })
      if (res.ok) {
        setDone(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'تعذّر تغيير كلمة المرور.')
      }
    } catch {
      setError('حدث خطأ ما')
    } finally {
      setLoading(false)
    }
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontFamily: font,
    fontSize: '14px',
    boxSizing: 'border-box',
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font }}>
      <div style={{ background: '#fff', padding: '32px 24px', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', width: '100%', maxWidth: '380px' }}>
        <h1 style={{ textAlign: 'center', margin: '0 0 20px', fontSize: '22px', color: '#333' }}>تعيين كلمة مرور جديدة</h1>

        {invalidLink ? (
          <div style={{ background: '#fdf0f0', border: '1px solid #f0cccc', color: '#a33', padding: '12px 14px', borderRadius: '8px', fontSize: '13px', lineHeight: 1.8 }}>
            رابط إعادة التعيين غير صالح. الرجاء طلب رابط جديد من صفحة «نسيت كلمة المرور».
          </div>
        ) : done ? (
          <div style={{ background: '#f0f7f0', border: '1px solid #cfe6cf', color: '#2e6b2e', padding: '12px 14px', borderRadius: '8px', fontSize: '13px', lineHeight: 1.8 }}>
            تم تغيير كلمة المرور بنجاح. تم إنهاء جميع الجلسات السابقة، ويمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333' }}>كلمة المرور الجديدة</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={fieldStyle}
              placeholder="8 أحرف على الأقل"
              required
            />
            <label style={{ display: 'block', margin: '14px 0 8px', fontSize: '14px', color: '#333' }}>تأكيد كلمة المرور</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              style={fieldStyle}
              placeholder="أعد إدخال كلمة المرور"
              required
            />
            {error && <div style={{ color: '#d33', marginTop: '10px', fontSize: '13px' }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '18px', padding: '10px 12px', borderRadius: '8px', border: 'none', background: '#111', color: '#fff', fontFamily: font, fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
          <a href="/admin/login" style={{ color: '#666', textDecoration: 'none' }}>الذهاب لتسجيل الدخول</a>
        </div>
      </div>
    </div>
  )
}
