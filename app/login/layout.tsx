import { AuthProvider } from '@/components/providers/auth-provider';
import { Toaster } from 'sonner';

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      {children}
      <Toaster />
    </AuthProvider>
  );
}
