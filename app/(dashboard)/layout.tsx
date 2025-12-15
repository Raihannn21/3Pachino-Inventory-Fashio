'use client';

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const scannerBufferRef = useRef('')
  const scannerTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Skip jika sudah di halaman POS atau PURCHASES (biar halaman tersebut yang handle)
      if (pathname === '/pos' || pathname === '/purchases') return

      // Skip jika user sedang mengetik di input field atau dialog
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        document.querySelector('[role="dialog"]')
      ) {
        return
      }

      // Jika Enter, process barcode dan redirect ke POS
      if (e.key === 'Enter' && scannerBufferRef.current.length > 0) {
        e.preventDefault()
        const barcode = scannerBufferRef.current.trim()
        
        if (barcode) {
          // Redirect ke POS dengan barcode di URL query
          router.push(`/pos?scan=${encodeURIComponent(barcode)}`)
        }
        
        scannerBufferRef.current = ''
        return
      }

      // Jika karakter biasa, tambahkan ke buffer
      if (e.key.length === 1) {
        scannerBufferRef.current += e.key

        // Clear buffer setelah 100ms (timeout untuk deteksi scan selesai)
        clearTimeout(scannerTimeoutRef.current)
        scannerTimeoutRef.current = setTimeout(() => {
          scannerBufferRef.current = ''
        }, 100)
      }
    }

    window.addEventListener('keypress', handleKeyPress)

    return () => {
      window.removeEventListener('keypress', handleKeyPress)
      clearTimeout(scannerTimeoutRef.current)
    }
  }, [router, pathname])

  return (
    <ProtectedRoute>
      <div className="flex flex-col md:flex-row h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-col flex-1 md:pl-64 overflow-hidden">
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="p-4 md:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
