"use client";

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, User, Lock, LogIn } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            setError('Email dan password harus diisi');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError('Email atau password salah');
                toast.error('Login gagal', {
                    description: 'Email atau password yang Anda masukkan salah'
                });
            } else {
                // Get session to check user role and permissions
                const session = await getSession();
                
                toast.success('Login berhasil', {
                    description: `Selamat datang, ${session?.user?.name || 'User'}!`
                });

                // Check user permissions to determine redirect
                try {
                    const permissionsRes = await fetch('/api/user/permissions');
                    const permissionsData = await permissionsRes.json();
                    
                    if (permissionsRes.ok && permissionsData.permissions) {
                        const userPermissions = permissionsData.permissions;
                        console.log('User permissions:', userPermissions);
                        
                        // Determine best route based on permissions priority
                        let redirectTo = '/unauthorized'; // default if no permissions
                        
                        if (userPermissions.includes('dashboard.view')) {
                            redirectTo = '/dashboard';
                        } else if (userPermissions.includes('pos.view')) {
                            redirectTo = '/pos';
                        } else if (userPermissions.includes('sales.view')) {
                            redirectTo = '/sales';
                        } else if (userPermissions.includes('products.view')) {
                            redirectTo = '/products';
                        } else if (userPermissions.includes('inventory.view')) {
                            redirectTo = '/inventory';
                        } else if (userPermissions.length > 0) {
                            // If user has any permission, try to redirect to first available module
                            const permissionToRoute: Record<string, string> = {
                                'purchases.view': '/purchases',
                                'customers.view': '/customers',
                                'reports.view': '/reports',
                                'users.view': '/users',
                                'admin.permissions': '/permissions'
                            };
                            
                            for (const permission of userPermissions) {
                                if (permissionToRoute[permission]) {
                                    redirectTo = permissionToRoute[permission];
                                    break;
                                }
                            }
                        }
                        
                        console.log('Redirecting to:', redirectTo);
                        router.push(redirectTo);
                    } else {
                        console.error('Failed to get permissions:', permissionsData);
                        router.push('/unauthorized');
                    }
                } catch (error) {
                    console.error('Error checking permissions:', error);
                    router.push('/unauthorized');
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            setError('Terjadi kesalahan saat login');
            toast.error('Terjadi kesalahan', {
                description: 'Silakan coba lagi'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4" suppressHydrationWarning>
            <div className="w-full max-w-md">
                {/* Brand Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent mb-3">
                        3PACHINO
                    </h1>
                    {/* <p className="text-lg text-gray-700 font-medium mb-2">Kelola Inventory</p> */}
                    <p className="text-gray-600">Fashion Brand Management System</p>
                </div>

                {/* Login Card */}
                <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                    {/* <CardHeader className="space-y-1 pb-6">
                        <CardTitle className="text-2xl font-bold text-center text-gray-900 flex items-center justify-center gap-2">
                            <LogIn className="h-6 w-6 text-blue-600" />
                            Masuk ke Akun
                        </CardTitle>
                        <p className="text-center text-gray-600 text-sm">
                            Masukkan email dan password untuk mengakses sistem
                        </p>
                    </CardHeader> */}

                    <CardContent className="space-y-6">
                        {error && (
                            <div className="border border-red-200 bg-red-50 p-3 rounded-md">
                                <p className="text-red-800 text-sm">
                                    {error}
                                </p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                                    Email
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="Masukkan email Anda"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                        disabled={isLoading}
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                                    Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Masukkan password Anda"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 pr-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                        disabled={isLoading}
                                        autoComplete="current-password"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-1 top-1 h-10 w-10 hover:bg-gray-100"
                                        onClick={() => setShowPassword(!showPassword)}
                                        disabled={isLoading}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4 text-gray-400" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-gray-400" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Memproses...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <LogIn className="h-4 w-4" />
                                        Masuk
                                    </div>
                                )}
                            </Button>
                        </form>

                        {/* Info for demo */}
                        {/* <div className="pt-4 border-t border-gray-200">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Demo Super Admin:</h4>
                <p className="text-xs text-blue-700 mb-1">Email: 3pachino@admin.com</p>
                <p className="text-xs text-blue-700">Password: Etripachnio</p>
              </div>
            </div> */}
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="text-center mt-8">
                    <p className="text-sm text-gray-500">
                        © 2025 3PACHINO. Sistem Manajemen Inventori Fashion.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                    </p>
                </div>
            </div>
        </div>
    );
}
