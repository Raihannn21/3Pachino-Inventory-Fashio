import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// PUT /api/admin/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    
    if (!session || session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { name, email, password, role } = await request.json();

    if (!name || !email || !role) {
      return NextResponse.json({ message: 'Name, email, and role are required' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Prevent editing super admin - check using string conversion
    const userRole = String(existingUser.role);
    if (userRole === 'SUPER_ADMIN') {
      return NextResponse.json({ message: 'Cannot edit super admin' }, { status: 403 });
    }

    // Check if email is already taken by another user
    const emailTaken = await prisma.user.findFirst({
      where: {
        email,
        id: { not: id }
      }
    });

    if (emailTaken) {
      return NextResponse.json({ message: 'Email already taken by another user' }, { status: 400 });
    }

    // Prepare update data
    const updateData: any = {
      name,
      email,
      role,
    };

    // Hash new password if provided
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 12);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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
    console.error('Error updating user:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    
    if (!session || session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Prevent deleting super admin - check using string conversion
    const userRole = String(existingUser.role);
    if (userRole === 'SUPER_ADMIN') {
      return NextResponse.json({ message: 'Cannot delete super admin' }, { status: 403 });
    }

    // Delete user
    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
