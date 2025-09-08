import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const rolePermissions = await prisma.rolePermission.findMany({
      include: {
        permission: true
      }
    });

    return NextResponse.json(rolePermissions);
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { rolePermissions } = await request.json();

    // Delete existing role permissions
    await prisma.rolePermission.deleteMany();

    // Create new role permissions
    const createData = rolePermissions
      .filter((rp: any) => rp.granted) // Only create granted permissions
      .map((rp: any) => ({
        role: rp.role,
        permissionId: rp.permissionId,
        granted: rp.granted
      }));

    if (createData.length > 0) {
      await prisma.rolePermission.createMany({
        data: createData
      });
    }

    return NextResponse.json({ message: 'Role permissions updated successfully' });
  } catch (error) {
    console.error('Error updating role permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
