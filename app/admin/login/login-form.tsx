'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push('/admin')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'كود الدخول غير صحيح')
      }
    } catch {
      setError('حدث خطأ ما')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cairo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '32px 24px', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', width: '100%', maxWidth: '380px' }}>
        <h1 style={{ textAlign: 'center', margin: '0 0 24px', fontSize: '22px', color: '#333' }}>لوحة إدارة Queen Store</h1>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333' }}>كود الدخول</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontFamily: 'Cairo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', fontSize: '14px' }}
          placeholder="أدخل كود الدخول"
          required
        />
        {error && <div style={{ color: '#d33', marginTop: '10px', fontSize: '13px' }}>{error}</div>}
        <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '18px', padding: '10px 12px', borderRadius: '8px', border: 'none', background: '#111', color: '#fff', fontFamily: 'Cairo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'جاري الدخول...' : 'دخول لوحة التحكم'}
        </button>
        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
          <a href="/" style={{ color: '#666', textDecoration: 'none' }}>العودة للمتجر</a>
        </div>
      </form>
    </div>
  )
}
