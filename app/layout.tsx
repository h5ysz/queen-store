import './globals.css'

export const metadata = {
  title: 'Queen Store — شنط وحقائب',
  description: 'متجر Queen للشنط والحقائب. اطلب عبر واتساب ودليفري سريع.',
  openGraph: {
    title: 'Queen Store — شنط وحقائب',
    description: 'متجر Queen للشنط والحقائب. اطلب عبر واتساب ودليفري سريع.',
    type: 'website',
    locale: 'ar_SA',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
