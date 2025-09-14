"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Shield, Lock, Save, RotateCcw, Users, Settings, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface Permission {
    id: string;
    name: string;
    description: string;
    category: string;
}

interface RolePermission {
    role: string;
    permissionId: string;
    granted: boolean;
}

type Role = 'OWNER' | 'MANAGER' | 'STAFF';

const ROLES: { value: Role; label: string; description: string; color: string }[] = [
    {
        value: 'OWNER',
        label: 'Owner',
        description: 'Pemilik bisnis dengan akses luas',
        color: 'bg-purple-100 text-purple-800'
    },
    {
        value: 'MANAGER',
        label: 'Manager',
        description: 'Mengelola operasional harian',
        color: 'bg-blue-100 text-blue-800'
    },
    {
        value: 'STAFF',
        label: 'Staff',
        description: 'Akses terbatas sesuai tugas',
        color: 'bg-green-100 text-green-800'
    }
];

export default function PermissionsPage() {
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [rolePermissions, setRolePermissions] = useState<Record<Role, Set<string>>>({
        OWNER: new Set(),
        MANAGER: new Set(),
        STAFF: new Set()
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingRole, setSavingRole] = useState<Role | null>(null);
    const [activeTab, setActiveTab] = useState<Role>('STAFF');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch permissions
            const permissionsRes = await fetch('/api/permissions');
            const permissionsData = await permissionsRes.json();

            // If no permissions exist, auto-generate them
            if (permissionsRes.ok && permissionsData.length === 0) {
                toast.info('Permissions tidak ditemukan, sedang generate data...');
                
                const seedRes = await fetch('/api/admin/seed-permissions', {
                    method: 'POST'
                });
                
                if (seedRes.ok) {
                    toast.success('Permissions berhasil di-generate!');
                    // Re-fetch permissions after seeding
                    const newPermissionsRes = await fetch('/api/permissions');
                    const newPermissionsData = await newPermissionsRes.json();
                    if (newPermissionsRes.ok) {
                        setPermissions(newPermissionsData);
                    }
                } else {
                    toast.error('Gagal generate permissions');
                }
            } else if (permissionsRes.ok) {
                setPermissions(permissionsData);
            }

            // Fetch role permissions
            const rolePermissionsRes = await fetch('/api/role-permissions');
            const rolePermissionsData = await rolePermissionsRes.json();

            if (rolePermissionsRes.ok) {
                const rolePermissionMap: Record<Role, Set<string>> = {
                    OWNER: new Set(),
                    MANAGER: new Set(),
                    STAFF: new Set()
                };

                rolePermissionsData.forEach((rp: RolePermission) => {
                    if (rp.granted) {
                        rolePermissionMap[rp.role as Role].add(rp.permissionId);
                    }
                });

                setRolePermissions(rolePermissionMap);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Gagal memuat data permissions');
        } finally {
            setLoading(false);
        }
    };

    const handlePermissionToggle = (role: Role, permissionId: string, granted: boolean) => {
        setRolePermissions(prev => {
            const newPermissions = { ...prev };
            if (granted) {
                newPermissions[role].add(permissionId);
            } else {
                newPermissions[role].delete(permissionId);
            }
            return newPermissions;
        });
    };

    const saveRolePermissions = async (role: Role) => {
        if (saving) return; // Prevent multiple calls

        try {
            setSaving(true);
            setSavingRole(role);

            // Prepare permissions data for this role only
            const permissionsData = permissions.map(permission => ({
                permissionId: permission.id,
                granted: rolePermissions[role].has(permission.id)
            }));

            const response = await fetch(`/api/role-permissions/${role}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    permissions: permissionsData
                }),
            });

            const result = await response.json();

            if (response.ok) {
                toast.success(`✅ Permissions untuk ${ROLES.find(r => r.value === role)?.label} berhasil disimpan`);
            } else {
                throw new Error(result.error || 'Failed to save permissions');
            }
        } catch (error) {
            console.error('Error saving permissions:', error);
            toast.error(`❌ Gagal menyimpan permissions untuk ${ROLES.find(r => r.value === role)?.label}`);
        } finally {
            setSaving(false);
            setSavingRole(null);
        }
    };

    const saveAllRoles = async () => {
        if (saving) return;

        try {
            setSaving(true);

            for (const role of ROLES) {
                setSavingRole(role.value);
                await saveRolePermissions(role.value);
                // Small delay to show progress
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            toast.success('🎉 Semua permissions berhasil disimpan!');
        } catch (error) {
            console.error('Error saving all permissions:', error);
            toast.error('Gagal menyimpan beberapa permissions');
        } finally {
            setSaving(false);
            setSavingRole(null);
        }
    };

    const generatePermissions = async (force: boolean = false) => {
        try {
            setLoading(true);
            toast.info(force ? 'Sedang regenerate semua permissions...' : 'Sedang generate permissions...');
            
            const response = await fetch('/api/admin/seed-permissions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ force })
            });
            
            if (response.ok) {
                const result = await response.json();
                toast.success('Permissions berhasil di-generate!');
                
                // Wait a bit then reload data
                setTimeout(async () => {
                    await fetchData();
                }, 1000);
            } else {
                const error = await response.json();
                toast.error(error.message || 'Gagal generate permissions');
            }
        } catch (error) {
            toast.error('Gagal generate permissions');
        } finally {
            setLoading(false);
        }
    };

    const resetToDefault = () => {
        const newRolePermissions: Record<Role, Set<string>> = {
            OWNER: new Set(),
            MANAGER: new Set(),
            STAFF: new Set()
        };

        permissions.forEach(permission => {
            // Owner gets most permissions (except admin)
            if (permission.category !== 'admin') {
                newRolePermissions.OWNER.add(permission.id);
            }

            // Manager gets operational permissions
            if (['dashboard', 'pos', 'sales', 'products', 'inventory'].includes(permission.category)) {
                newRolePermissions.MANAGER.add(permission.id);
            }

            // Staff gets basic view permissions
            if (['dashboard', 'pos'].includes(permission.category) && permission.name.includes('.view')) {
                newRolePermissions.STAFF.add(permission.id);
            }
        });

        setRolePermissions(newRolePermissions);
        toast.info('Hak akses direset ke default');
    };

    const getPermissionsByCategory = () => {
        const categorized: Record<string, Permission[]> = {};
        permissions.forEach(permission => {
            if (!categorized[permission.category]) {
                categorized[permission.category] = [];
            }
            categorized[permission.category].push(permission);
        });
        
        return categorized;
    };

    const getPermissionCount = (role: Role) => {
        return rolePermissions[role].size;
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'dashboard': return '📊';
            case 'pos': return '💳';
            case 'sales': return '🛒';
            case 'products': return '📦';
            case 'inventory': return '🏪';
            case 'purchases': return '🚚';
            case 'suppliers': return '🏢';
            case 'customers': return '👥';
            case 'reports': return '📈';
            case 'users': return '👤';
            case 'admin': return '⚙️';
            default: return '🔧';
        }
    };

    const getCategoryName = (category: string) => {
        const names: Record<string, string> = {
            dashboard: 'Dashboard',
            pos: 'Point of Sale',
            sales: 'Penjualan',
            products: 'Produk',
            inventory: 'Inventory',
            purchases: 'Pembelian',
            suppliers: 'Supplier',
            customers: 'Pelanggan',
            reports: 'Laporan',
            users: 'Manajemen User',
            admin: 'Admin System'
        };
        return names[category] || category;
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">
                {/* Header Skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-3">
                    <div>
                        <div className="h-6 sm:h-8 w-24 sm:w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="h-4 w-40 sm:w-56 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="h-8 sm:h-10 w-36 sm:w-40 bg-gray-200 rounded animate-pulse"></div>
                </div>

                {/* Loading Animation Center */}
                <div className="flex items-center justify-center mb-6 sm:mb-8">
                    <div className="text-center">
                        <div className="relative mb-4">
                            <Shield className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-blue-600 animate-pulse" />
                        </div>
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Memuat Hak Akses</h2>
                        <p className="text-sm text-gray-600">Mengambil data permissions dan roles...</p>
                        <div className="flex items-center justify-center mt-4 space-x-1">
                            <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"></div>
                            <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                    </div>
                </div>

                {/* Permission Cards Skeleton */}
                <div className="grid gap-4 sm:gap-6">
                    {[1, 2, 3].map((item) => (
                        <Card key={item} className="border-0 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
                                <div className="flex items-center space-x-3">
                                    <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gray-200 rounded-full animate-pulse"></div>
                                    <div>
                                        <div className="h-4 w-20 sm:w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                                        <div className="h-3 w-32 sm:w-40 bg-gray-200 rounded animate-pulse"></div>
                                    </div>
                                </div>
                                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="space-y-3">
                                    {[1, 2, 3, 4, 5, 6].map((j) => (
                                        <div key={j} className="h-10 bg-gray-100 rounded animate-pulse"></div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Hak Akses</h1>
                    <p className="text-gray-600">Kelola permissions untuk setiap role pengguna</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {permissions.length === 0 && (
                        <Button
                            onClick={() => generatePermissions(false)}
                            disabled={loading}
                            size="sm"
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {loading ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Settings className="h-4 w-4 mr-2" />
                            )}
                            Generate Permissions
                        </Button>
                    )}
                    {permissions.length > 0 && (
                        <Button
                            onClick={() => generatePermissions(true)}
                            disabled={loading}
                            size="sm"
                            variant="outline"
                            className="w-full sm:w-auto border-blue-600 text-blue-600 hover:bg-blue-50"
                        >
                            {loading ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Regenerate All Permissions
                        </Button>
                    )}
                    <Button
                        onClick={saveAllRoles}
                        disabled={saving || permissions.length === 0}
                        size="sm"
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                    >
                        {saving ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Simpan Semua
                    </Button>
                    <Button
                        onClick={resetToDefault}
                        variant="outline"
                        size="sm"
                        disabled={saving}
                        className="w-full sm:w-auto"
                    >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset Default
                    </Button>
                    <Button
                        onClick={fetchData}
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        className="w-full sm:w-auto"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Info Alert */}
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Super Admin memiliki akses penuh secara otomatis. Pengaturan di bawah ini untuk role lainnya.
                </AlertDescription>
            </Alert>

            {/* No Permissions Message */}
            {permissions.length === 0 && (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Permissions Belum Tersedia</h3>
                            <p className="text-gray-600 mb-6">
                                Database permissions kosong. Silakan generate permissions default untuk memulai.
                            </p>
                            <Button
                                onClick={() => generatePermissions(false)}
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {loading ? (
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Settings className="h-4 w-4 mr-2" />
                                )}
                                Generate Permissions Default
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Mobile/Desktop Toggle Views */}
            {permissions.length > 0 && (
                <>
                <div className="block lg:hidden">
                {/* Mobile View - Tabs */}
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Role)}>
                    <TabsList className="grid w-full grid-cols-3 gap-1 p-1 h-auto">
                        {ROLES.map((role) => (
                            <TabsTrigger
                                key={role.value}
                                value={role.value}
                                className="flex flex-col items-center p-3 text-xs data-[state=active]:bg-white"
                            >
                                <Badge className={`${role.color} text-xs mb-1`}>
                                    {role.label}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                    {getPermissionCount(role.value)} permissions
                                </span>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {ROLES.map((role) => (
                        <TabsContent key={role.value} value={role.value} className="mt-6">
                            <Card>
                                <CardHeader className="pb-4">
                                    <div className="flex flex-col items-start justify-between gap-4">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <Users className="h-5 w-5" />
                                                {role.label}
                                            </CardTitle>
                                            <CardDescription>{role.description}</CardDescription>
                                        </div>
                                        <Button
                                            onClick={() => saveRolePermissions(role.value)}
                                            disabled={saving}
                                            size="sm"
                                            className={`w-full ${savingRole === role.value
                                                    ? 'bg-yellow-600 hover:bg-yellow-700'
                                                    : 'bg-green-600 hover:bg-green-700'
                                                } text-white font-medium`}
                                        >
                                            {saving && savingRole === role.value ? (
                                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <Save className="h-4 w-4 mr-2" />
                                            )}
                                            {saving && savingRole === role.value ? 'Menyimpan...' : `Simpan ${role.label}`}
                                        </Button>
                                    </div>
                                </CardHeader>

                                <CardContent>
                                    <div className="space-y-6">
                                        {Object.entries(getPermissionsByCategory()).map(([category, categoryPermissions]) => (
                                            <div key={category} className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{getCategoryIcon(category)}</span>
                                                    <h3 className="font-medium text-gray-900">
                                                        {getCategoryName(category)}
                                                    </h3>
                                                    <Separator className="flex-1" />
                                                </div>

                                                <div className="grid gap-3">
                                                    {categoryPermissions.map((permission) => (
                                                        <div
                                                            key={permission.id}
                                                            className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                                                        >
                                                            <Checkbox
                                                                id={`${role.value}-${permission.id}`}
                                                                checked={rolePermissions[role.value].has(permission.id)}
                                                                onCheckedChange={(checked) =>
                                                                    handlePermissionToggle(role.value, permission.id, checked as boolean)
                                                                }
                                                                className="mt-0.5"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <Label
                                                                    htmlFor={`${role.value}-${permission.id}`}
                                                                    className="text-sm font-medium cursor-pointer"
                                                                >
                                                                    {permission.description || permission.name}
                                                                </Label>
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    {permission.name}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>

            {/* Desktop View - Table */}
            <div className="hidden lg:block">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="h-5 w-5" />
                                Matrix Hak Akses
                            </CardTitle>
                            <div className="flex flex-wrap gap-2">
                                {ROLES.map(role => (
                                    <Button
                                        key={role.value}
                                        onClick={() => saveRolePermissions(role.value)}
                                        disabled={saving}
                                        size="sm"
                                        className={`${savingRole === role.value
                                                ? 'bg-yellow-600 hover:bg-yellow-700'
                                                : 'bg-blue-600 hover:bg-blue-700'
                                            } text-white`}
                                    >
                                        {saving && savingRole === role.value ? (
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4 mr-2" />
                                        )}
                                        {saving && savingRole === role.value ? 'Menyimpan...' : `Simpan ${role.label}`}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left p-4 font-medium text-gray-900 min-w-[300px]">
                                            Permission
                                        </th>
                                        {ROLES.map(role => (
                                            <th key={role.value} className="text-center p-4 min-w-[120px]">
                                                <div className="flex flex-col items-center gap-1">
                                                    <Badge className={role.color}>
                                                        {role.label}
                                                    </Badge>
                                                    <span className="text-xs text-gray-500">
                                                        {getPermissionCount(role.value)} granted
                                                    </span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(getPermissionsByCategory()).map(([category, categoryPermissions]) => (
                                        <React.Fragment key={category}>
                                            <tr className="bg-gray-25">
                                                <td colSpan={ROLES.length + 1} className="p-4">
                                                    <div className="flex items-center gap-2 font-medium text-gray-700">
                                                        <span className="text-lg">{getCategoryIcon(category)}</span>
                                                        {getCategoryName(category)}
                                                    </div>
                                                </td>
                                            </tr>
                                            {categoryPermissions.map((permission, index) => (
                                                <tr key={permission.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                    <td className="p-4">
                                                        <div>
                                                            <div className="font-medium text-gray-900">
                                                                {permission.description || permission.name}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {permission.name}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {ROLES.map(role => (
                                                        <td key={role.value} className="p-4 text-center">
                                                            <Checkbox
                                                                checked={rolePermissions[role.value].has(permission.id)}
                                                                onCheckedChange={(checked) =>
                                                                    handlePermissionToggle(role.value, permission.id, checked as boolean)
                                                                }
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <Users className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                            <p className="font-medium mb-2">Informasi Role:</p>
                            <div className="grid gap-2 sm:grid-cols-1 lg:grid-cols-3">
                                <div>
                                    <strong>Owner:</strong> Akses ke sebagian besar fitur kecuali admin system
                                </div>
                                <div>
                                    <strong>Manager:</strong> Akses ke operasional harian dan laporan
                                </div>
                                <div>
                                    <strong>Staff:</strong> Akses terbatas ke fitur dasar seperti POS
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
                </>
            )}
        </div>
    );
}
