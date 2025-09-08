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

        // Require authentication for all protected routes
        if (!token) {
          return false;
        }

        // For now, just check if user is authenticated
        // Permission checking will be done at component level
        return true;
      },
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/(dashboard)/:path*', '/((?!api|_next/static|_next/image|favicon.ico|login).*)']
};
