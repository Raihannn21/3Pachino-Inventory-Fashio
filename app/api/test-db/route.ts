import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect();
    
    // Try to count users
    const userCount = await prisma.user.count();
    
    // Check if super admin exists
    const superAdmin = await prisma.user.findUnique({
      where: { email: '3pachino@admin.com' }
    });

    return NextResponse.json({
      status: 'success',
      message: 'Database connected successfully',
      data: {
        userCount,
        superAdminExists: !!superAdmin,
        superAdmin: superAdmin ? {
          id: superAdmin.id,
          email: superAdmin.email,
          name: superAdmin.name,
          role: superAdmin.role
        } : null
      }
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
