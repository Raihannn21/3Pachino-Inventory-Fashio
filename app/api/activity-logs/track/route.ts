import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { logActivity, getResourceFromPath, getClientIp } from '@/lib/activity-logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, path, resourceId, metadata } = body;

    // Extract resource from path
    const resource = getResourceFromPath(path);

    // Get client info
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    // Log activity
    await logActivity({
      userId: session.user.id,
      userEmail: session.user.email!,
      userName: session.user.name || undefined,
      userRole: session.user.role as any,
      action: action || 'PAGE_VIEW',
      resource,
      resourceId,
      path,
      method: 'GET', // Page views are GET
      ipAddress,
      userAgent,
      metadata,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking activity:', error);
    // Don't fail - just return success to avoid breaking app
    return NextResponse.json({ success: true });
  }
}
