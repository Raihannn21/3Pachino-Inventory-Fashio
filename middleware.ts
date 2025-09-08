import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to login page and root path
        if (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/') {
          return true;
        }
        
        // Admin routes require SUPER_ADMIN role
        if (req.nextUrl.pathname.startsWith('/admin')) {
          return token?.role === 'SUPER_ADMIN';
        }
        
        // Dashboard and other protected routes require authentication
        if (req.nextUrl.pathname.startsWith('/dashboard') || 
            req.nextUrl.pathname.startsWith('/pos') ||
            req.nextUrl.pathname.startsWith('/sales') ||
            req.nextUrl.pathname.startsWith('/products') ||
            req.nextUrl.pathname.startsWith('/inventory') ||
            req.nextUrl.pathname.startsWith('/purchases') ||
            req.nextUrl.pathname.startsWith('/suppliers') ||
            req.nextUrl.pathname.startsWith('/customers') ||
            req.nextUrl.pathname.startsWith('/reports')) {
          return !!token;
        }
        
        return true;
      },
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/(dashboard)/:path*', '/((?!api|_next/static|_next/image|favicon.ico|login).*)']
};
