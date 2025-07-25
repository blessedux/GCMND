import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Multi-Hand Gesture Recognition',
  description: 'Real-time multi-hand gesture recognition using MediaPipe and p5.js',
  keywords: ['hand-gesture', 'mediapipe', 'p5js', 'computer-vision', 'multi-hand'],
  authors: [{ name: 'Your Name' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
} 