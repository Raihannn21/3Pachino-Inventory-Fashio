import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/components/providers/auth-provider'
import { PermissionProvider } from '@/components/providers/permission-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '3PACHINO - Sistem Manajemen Inventori Fashion',
  description: 'Sistem manajemen inventori fashion untuk brand 3PACHINO',
  icons: {
    icon: '/3pachino.jpg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <PermissionProvider>
            {children}
            <Toaster />
          </PermissionProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
