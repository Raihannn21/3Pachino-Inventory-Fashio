import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export interface ActivityLogData {
  userId: string;
  userEmail: string;
  userName?: string;
  userRole: UserRole;
  action: 'PAGE_VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT' | 'VOID' | 'REFUND';
  resource: string; // 'dashboard', 'products', 'sales', etc.
  resourceId?: string;
  path: string;
  method?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

// Simplified log data for API routes
export interface SimpleLogData {
  userId: string;
  action: 'PAGE_VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT' | 'VOID' | 'REFUND';
  resource: string;
  resourceId?: string;
  metadata?: any;
}

/**
 * Log user activity to database
 * Only Super Admin can view these logs
 */
export async function logActivity(data: ActivityLogData | SimpleLogData, request?: any) {
  try {
    // If simplified data, fetch user info and request details
    if (!('userEmail' in data)) {
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { email: true, name: true, role: true }
      });

      if (!user) {
        console.error('User not found for activity log');
        return;
      }

      const fullData: ActivityLogData = {
        userId: data.userId,
        userEmail: user.email,
        userName: user.name || undefined,
        userRole: user.role,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        path: request?.url || request?.nextUrl?.pathname || `/${data.resource}`,
        method: request?.method || 'POST',
        ipAddress: getClientIp(request),
        userAgent: request?.headers?.get?.('user-agent') || undefined,
        metadata: data.metadata,
      };

      await prisma.activityLog.create({
        data: {
          userId: fullData.userId,
          userEmail: fullData.userEmail,
          userName: fullData.userName || null,
          userRole: fullData.userRole,
          action: fullData.action,
          resource: fullData.resource,
          resourceId: fullData.resourceId || null,
          path: fullData.path,
          method: fullData.method || null,
          ipAddress: fullData.ipAddress || null,
          userAgent: fullData.userAgent || null,
          metadata: fullData.metadata || null,
        },
      });
    } else {
      // Full data provided
      await prisma.activityLog.create({
        data: {
          userId: data.userId,
          userEmail: data.userEmail,
          userName: data.userName || null,
          userRole: data.userRole,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId || null,
          path: data.path,
          method: data.method || null,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
          metadata: data.metadata || null,
        },
      });
    }
  } catch (error) {
    // Silent fail - don't break app if logging fails
    console.error('Failed to log activity:', error);
  }
}

/**
 * Get activity logs with filters (Super Admin only)
 */
export async function getActivityLogs(filters?: {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};

  if (filters?.userId) {
    where.userId = filters.userId;
  }

  if (filters?.action) {
    where.action = filters.action;
  }

  if (filters?.resource) {
    where.resource = filters.resource;
  }

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return {
    logs,
    total,
    limit: filters?.limit || 50,
    offset: filters?.offset || 0,
  };
}

/**
 * Get activity statistics (Super Admin only)
 */
export async function getActivityStats(filters?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const where: any = {};

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate;
    }
  }

  const totalActivities = await prisma.activityLog.count({ where });
  
  const activityByAction = await prisma.activityLog.groupBy({
    by: ['action'],
    where,
    _count: {
      action: true,
    },
  });

  const activityByResource = await prisma.activityLog.groupBy({
    by: ['resource'],
    where,
    _count: {
      resource: true,
    },
  });

  const activityByUser = await prisma.activityLog.groupBy({
    by: ['userId', 'userEmail', 'userName', 'userRole'],
    where,
    _count: {
      userId: true,
    },
  });

  // Sort and limit manually
  const sortedByAction = activityByAction
    .map(item => ({ action: item.action, _count: item._count.action }))
    .sort((a, b) => b._count - a._count);

  const sortedByResource = activityByResource
    .map(item => ({ resource: item.resource, _count: item._count.resource }))
    .sort((a, b) => b._count - a._count);

  const sortedByUser = activityByUser
    .map(item => ({ 
      userId: item.userId, 
      userEmail: item.userEmail, 
      userName: item.userName,
      userRole: item.userRole,
      _count: item._count.userId 
    }))
    .sort((a, b) => b._count - a._count)
    .slice(0, 10);

  return {
    totalActivities,
    activityByAction: sortedByAction,
    activityByResource: sortedByResource,
    topUsers: sortedByUser,
  };
}

/**
 * Helper to extract resource name from path
 */
export function getResourceFromPath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  
  // Map paths to resource names
  const resourceMap: Record<string, string> = {
    'dashboard': 'dashboard',
    'pos': 'pos',
    'sales': 'sales',
    'products': 'products',
    'inventory': 'inventory',
    'purchases': 'purchases',
    'suppliers': 'suppliers',
    'customers': 'customers',
    'reports': 'reports',
    'users': 'users',
    'permissions': 'permissions',
    'admin-backup': 'admin',
  };

  const firstSegment = segments[0];
  return resourceMap[firstSegment] || firstSegment || 'unknown';
}

/**
 * Helper to get client IP from request
 */
export function getClientIp(request: Request): string | undefined {
  const headers = request.headers;
  
  return (
    headers.get('x-forwarded-for')?.split(',')[0] ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') || // Cloudflare
    undefined
  );
}
