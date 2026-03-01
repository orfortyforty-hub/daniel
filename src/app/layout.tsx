import type { Metadata } from 'next'
import { Assistant, Playfair_Display } from 'next/font/google'
import './globals.css'

const assistant = Assistant({ subsets: ['hebrew'], variable: '--font-assistant' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: 'Daniel is 12!',
  description: 'Daniel\'s 12th Birthday Party Invite',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${assistant.variable} ${playfair.variable}`}>{children}</body>
    </html>
  )
}
