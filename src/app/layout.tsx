import type { Metadata } from 'next'
import { Nunito, Pacifico } from 'next/font/google'
import './globals.css'

const nunito = Nunito({ subsets: ['latin'], variable: '--font-assistant' })
const pacifico = Pacifico({ subsets: ['latin'], weight: '400', variable: '--font-playfair' })

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
      <body className={`${nunito.variable} ${pacifico.variable}`}>{children}</body>
    </html>
  )
}
