import type { Metadata } from 'next'
import { Nunito, Baloo_2 } from 'next/font/google'
import './globals.css'

const nunito = Nunito({ subsets: ['latin'], variable: '--font-assistant' })
const baloo = Baloo_2({ subsets: ['latin'], weight: ['400', '700', '800'], variable: '--font-playfair' })

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
    <html lang="en" dir="ltr">
      <body className={`${nunito.variable} ${baloo.variable}`}>{children}</body>
    </html>
  )
}
