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

    // Log untuk debugging
    console.log('Received rolePermissions:', rolePermissions.length, 'items');
    
    // Get unique roles from the request
    const roleSet = new Set(rolePermissions.map((rp: any) => rp.role));
    const affectedRoles = Array.from(roleSet);
    console.log('Affected roles:', affectedRoles);

    // Process each role separately to avoid conflicts
    for (const role of affectedRoles) {
      const rolePerms = rolePermissions.filter((rp: any) => rp.role === role);
      
      console.log(`Processing ${rolePerms.length} permissions for role: ${role}`);
      
      // Delete existing permissions for this specific role
      await prisma.rolePermission.deleteMany({
        where: { role: role as any }
      });

      // Insert only granted permissions for this role
      const grantedPermissions = rolePerms.filter((rp: any) => rp.granted);
      
      if (grantedPermissions.length > 0) {
        console.log(`Creating ${grantedPermissions.length} granted permissions for ${role}`);
        
        await prisma.rolePermission.createMany({
          data: grantedPermissions.map((rp: any) => ({
            role: rp.role,
            permissionId: rp.permissionId,
            granted: true
          }))
        });
      }
    }

    // Verify the result
    const updatedPermissions = await prisma.rolePermission.findMany({
      where: {
        role: { in: affectedRoles as any }
      },
      include: {
        permission: true
      }
    });

    console.log('Updated permissions count:', updatedPermissions.length);

    return NextResponse.json({ 
      message: 'Role permissions updated successfully',
      affectedRoles,
      updatedCount: updatedPermissions.length
    });
  } catch (error) {
    console.error('Error updating role permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
