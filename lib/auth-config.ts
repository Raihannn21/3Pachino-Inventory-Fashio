import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Check if this is the super admin
          if (credentials.email === '3pachino@admin.com' && credentials.password === 'Etripachnio') {
            // Check if super admin exists in database, if not create it
            let superAdmin = await prisma.user.findUnique({
              where: { email: '3pachino@admin.com' }
            });

            if (!superAdmin) {
              const hashedPassword = await bcrypt.hash('Etripachnio', 12);
              superAdmin = await prisma.user.create({
                data: {
                  email: '3pachino@admin.com',
                  name: 'Super Admin',
                  password: hashedPassword,
                  role: 'SUPER_ADMIN' as any // Cast untuk menghindari TypeScript error sementara
                }
              });
            }

            return {
              id: superAdmin.id,
              email: superAdmin.email,
              name: superAdmin.name,
              role: String(superAdmin.role) // Convert enum to string untuk konsistensi
            };
          }

          // Check regular users in database
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          if (!user) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          
          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: String(user.role) // Convert enum to string untuk konsistensi
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Redirect to dashboard after successful login
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/dashboard`;
      }
      return url.startsWith(baseUrl) ? url : baseUrl;
    }
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key'
};
