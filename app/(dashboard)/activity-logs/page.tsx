'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Activity, 
  Search, 
  Filter,
  Calendar,
  User,
  FileText,
  BarChart3,
  RefreshCw,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';

interface ActivityLog {
  id: string;
  userEmail: string;
  userName: string | null;
  userRole: string;
  action: string;
  resource: string;
  resourceId: string | null;
  path: string;
  method: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
}

interface Stats {
  totalActivities: number;
  activityByAction: Array<{ action: string; _count: number }>;
  activityByResource: Array<{ resource: string; _count: number }>;
  topUsers: Array<{ userId: string; userEmail: string; userName: string | null; _count: number }>;
}

export default function ActivityLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedResource, setSelectedResource] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  // Check if Super Admin
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      toast.error('Akses ditolak - Hanya Super Admin');
      router.push('/dashboard');
    }
  }, [session, status, router]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((currentPage - 1) * limit).toString(),
      });

      if (selectedAction !== 'all') {
        params.append('action', selectedAction);
      }

      if (selectedResource !== 'all') {
        params.append('resource', selectedResource);
      }

      const response = await fetch(`/api/activity-logs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setTotalPages(Math.ceil(data.total / limit));
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Gagal memuat activity logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/activity-logs?stats=true');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'SUPER_ADMIN') {
      fetchLogs();
      fetchStats();
    }
  }, [session, currentPage, selectedAction, selectedResource]);

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      PAGE_VIEW: 'bg-blue-100 text-blue-700',
      CREATE: 'bg-green-100 text-green-700',
      UPDATE: 'bg-yellow-100 text-yellow-700',
      DELETE: 'bg-red-100 text-red-700',
      LOGIN: 'bg-purple-100 text-purple-700',
      LOGOUT: 'bg-gray-100 text-gray-700',
      EXPORT: 'bg-orange-100 text-orange-700',
      VOID: 'bg-pink-100 text-pink-700',
      REFUND: 'bg-indigo-100 text-indigo-700',
    };

    return (
      <Badge className={colors[action] || 'bg-gray-100 text-gray-700'}>
        {action}
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      SUPER_ADMIN: 'destructive',
      OWNER: 'default',
      MANAGER: 'secondary',
      STAFF: 'outline',
    };

    return <Badge variant={colors[role] as any}>{role}</Badge>;
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = searchTerm === '' || 
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.path.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  if (status === 'loading' || !session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (session.user.role !== 'SUPER_ADMIN') {
    return null;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Activity Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor semua aktivitas pengguna di sistem (Super Admin Only)
          </p>
        </div>
        <Button onClick={() => { fetchLogs(); fetchStats(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActivities.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Action</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.activityByAction[0]?.action || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.activityByAction[0]?._count || 0} times
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Resource</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.activityByResource[0]?.resource || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.activityByResource[0]?._count || 0} times
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.topUsers.length}</div>
              <p className="text-xs text-muted-foreground">users logged</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter & Pencarian
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari user, resource, path..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger>
                <SelectValue placeholder="Semua Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Action</SelectItem>
                <SelectItem value="PAGE_VIEW">PAGE_VIEW</SelectItem>
                <SelectItem value="CREATE">CREATE</SelectItem>
                <SelectItem value="UPDATE">UPDATE</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                <SelectItem value="LOGIN">LOGIN</SelectItem>
                <SelectItem value="LOGOUT">LOGOUT</SelectItem>
                <SelectItem value="EXPORT">EXPORT</SelectItem>
                <SelectItem value="VOID">VOID</SelectItem>
                <SelectItem value="REFUND">REFUND</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedResource} onValueChange={setSelectedResource}>
              <SelectTrigger>
                <SelectValue placeholder="Semua Resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Resource</SelectItem>
                <SelectItem value="dashboard">Dashboard</SelectItem>
                <SelectItem value="pos">POS</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="products">Products</SelectItem>
                <SelectItem value="inventory">Inventory</SelectItem>
                <SelectItem value="purchases">Purchases</SelectItem>
                <SelectItem value="suppliers">Suppliers</SelectItem>
                <SelectItem value="customers">Customers</SelectItem>
                <SelectItem value="reports">Reports</SelectItem>
                <SelectItem value="users">Users</SelectItem>
                <SelectItem value="permissions">Permissions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs ({filteredLogs.length})</CardTitle>
          <CardDescription>
            Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, filteredLogs.length)} of {filteredLogs.length} activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Tidak ada activity logs
              </h3>
              <p className="text-sm text-muted-foreground">
                Belum ada aktivitas yang tercatat
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.createdAt), 'dd MMM yyyy HH:mm:ss', { locale: id })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.userName || '-'}</div>
                            <div className="text-xs text-muted-foreground">{log.userEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(log.userRole)}</TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.resource}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={log.path}>
                          {log.path}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.ipAddress || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
