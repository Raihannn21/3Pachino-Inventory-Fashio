import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PATCH /api/admin/users/[id]/toggle - Toggle user active status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    
    if (!session || session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { isActive } = await request.json();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Prevent toggling super admin - check using string conversion
    const userRole = String(existingUser.role);
    if (userRole === 'SUPER_ADMIN') {
      return NextResponse.json({ message: 'Cannot modify super admin status' }, { status: 403 });
    }

    // Update user status
    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error toggling user status:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
