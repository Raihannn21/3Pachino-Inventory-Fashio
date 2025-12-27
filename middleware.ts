import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Route permission mapping
    const routePermissions: Record<string, string> = {
      '/dashboard': 'dashboard.view',
      '/pos': 'pos.view',
      '/sales': 'sales.view',
      '/products': 'products.view',
      '/inventory': 'inventory.view',
      '/purchases': 'purchases.view',
      '/customers': 'customers.view',
      '/reports': 'reports.view',
      '/users': 'users.view',
      '/permissions': 'admin.permissions'
    };

    // Super Admin has access to everything
    if (token?.role === 'SUPER_ADMIN') {
      return NextResponse.next();
    }

    // Restrict access to admin-only routes
    if (pathname.startsWith('/users') || pathname.startsWith('/permissions')) {
      if (token?.role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }

    // For other routes, permission checking will be done at component level
    // since we can't easily query database in middleware
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Allow access to public routes
        if (pathname === '/login' || pathname === '/' || pathname === '/unauthorized') {
          return true;
        }

        // Require authentication for all protected routes
        if (!token) {
          return false;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ]
};
