import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

interface Params {
  params: {
    role: string;
  };
}

// PUT - Update permissions for a specific role
export async function PUT(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { permissions } = await request.json();
    const { role } = params;

    // Validate role
    const validRoles = ['OWNER', 'MANAGER', 'STAFF'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    console.log(`Updating permissions for role: ${role}`);
    console.log(`Received ${permissions.length} permissions`);

    // Delete existing permissions for this role only
    await prisma.rolePermission.deleteMany({
      where: { role: role as any }
    });

    // Filter granted permissions
    const grantedPermissions = permissions.filter((p: any) => p.granted);
    
    console.log(`Creating ${grantedPermissions.length} granted permissions for ${role}`);

    // Create new granted permissions for this role
    if (grantedPermissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: grantedPermissions.map((p: any) => ({
          role: role as any,
          permissionId: p.permissionId,
          granted: true
        }))
      });
    }

    // Get updated permissions for verification
    const updatedPermissions = await prisma.rolePermission.findMany({
      where: { role: role as any },
      include: {
        permission: true
      }
    });

    console.log(`Successfully updated ${updatedPermissions.length} permissions for ${role}`);

    return NextResponse.json({ 
      message: `Permissions for ${role} updated successfully`,
      updatedCount: updatedPermissions.length,
      permissions: updatedPermissions
    });

  } catch (error) {
    console.error(`Error updating permissions for role ${params.role}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
