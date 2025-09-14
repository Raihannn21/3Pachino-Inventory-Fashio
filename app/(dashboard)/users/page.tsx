"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { UserPlus, Users, Eye, EyeOff, Edit2, Trash2, MoreVertical } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface User {
    id: string
    name: string
    email: string
    role: string
    createdAt: string
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddForm, setShowAddForm] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'STAFF'
    })
    const [editFormData, setEditFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'STAFF'
    })

    useEffect(() => {
        loadUsers()
    }, [])

    const loadUsers = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/users')
            if (response.ok) {
                const data = await response.json()
                setUsers(data)
            } else {
                console.error('Failed to load users:', response.status)
                toast.error('Gagal memuat daftar user')
            }
        } catch (error) {
            console.error('Error loading users:', error)
            toast.error('Terjadi kesalahan saat memuat user')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })

            const data = await response.json()

            if (response.ok) {
                toast.success('User berhasil ditambahkan!')
                setFormData({ name: '', email: '', password: '', role: 'STAFF' })
                setShowAddForm(false)
                loadUsers()
            } else {
                toast.error(data.error || 'Gagal menambahkan user')
            }
        } catch (error) {
            console.error('Error creating user:', error)
            toast.error('Terjadi kesalahan saat menambahkan user')
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = (user: User) => {
        setEditingUser(user)
        setEditFormData({
            name: user.name,
            email: user.email,
            password: '',
            role: user.role
        })
        setShowEditDialog(true)
    }

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingUser) return

        setLoading(true)

        try {
            const updateData: any = {
                name: editFormData.name,
                email: editFormData.email,
                role: editFormData.role
            }

            // Only include password if it's provided
            if (editFormData.password.trim()) {
                updateData.password = editFormData.password
            }

            const response = await fetch(`/api/users/${editingUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            })

            const data = await response.json()

            if (response.ok) {
                toast.success('User berhasil diperbarui!')
                setShowEditDialog(false)
                setEditingUser(null)
                setEditFormData({ name: '', email: '', password: '', role: 'STAFF' })
                loadUsers()
            } else {
                toast.error(data.error || 'Gagal memperbarui user')
            }
        } catch (error) {
            console.error('Error updating user:', error)
            toast.error('Terjadi kesalahan saat memperbarui user')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (user: User) => {
        try {
            const response = await fetch(`/api/users/${user.id}`, {
                method: 'DELETE',
            })

            const data = await response.json()

            if (response.ok) {
                toast.success('User berhasil dihapus!')
                loadUsers()
            } else {
                toast.error(data.error || 'Gagal menghapus user')
            }
        } catch (error) {
            console.error('Error deleting user:', error)
            toast.error('Terjadi kesalahan saat menghapus user')
        }
    }

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN':
                return 'bg-red-100 text-red-800'
            case 'OWNER':
                return 'bg-purple-100 text-purple-800'
            case 'MANAGER':
                return 'bg-blue-100 text-blue-800'
            case 'STAFF':
                return 'bg-green-100 text-green-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN':
                return 'Super Admin'
            case 'OWNER':
                return 'Owner'
            case 'MANAGER':
                return 'Manager'
            case 'STAFF':
                return 'Staff'
            default:
                return role
        }
    }

    // Loading state
    if (loading) {
        return (
            <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">
                {/* Header Skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-3">
                    <div>
                        <div className="h-6 sm:h-8 w-32 sm:w-40 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="h-4 w-40 sm:w-56 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="h-8 sm:h-10 w-28 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
                </div>

                {/* Loading Animation Center */}
                <div className="flex items-center justify-center mb-6 sm:mb-8">
                    <div className="text-center">
                        <div className="relative mb-4">
                            <Users className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-blue-600 animate-pulse" />
                        </div>
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Memuat Data User</h2>
                        <p className="text-sm text-gray-600">Mengambil daftar pengguna terbaru...</p>
                        <div className="flex items-center justify-center mt-4 space-x-1">
                            <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"></div>
                            <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                    </div>
                </div>

                {/* Users Cards Skeleton */}
                <div className="grid gap-4 sm:gap-6">
                    {[1, 2, 3].map((item) => (
                        <Card key={item} className="border-0 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
                                <div className="flex items-center space-x-3">
                                    <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gray-200 rounded-full animate-pulse"></div>
                                    <div>
                                        <div className="h-4 w-24 sm:w-32 bg-gray-200 rounded animate-pulse mb-1"></div>
                                        <div className="h-3 w-32 sm:w-40 bg-gray-200 rounded animate-pulse"></div>
                                    </div>
                                </div>
                                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex justify-between items-center">
                                    <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                                    <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manajemen User</h1>
                    <p className="text-gray-600">Kelola pengguna sistem inventori</p>
                </div>
                <Button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2"
                >
                    <UserPlus className="h-4 w-4" />
                    Tambah User
                </Button>
            </div>

            {/* Add User Form */}
            {showAddForm && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5" />
                            Tambah User Baru
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nama Lengkap</Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Masukkan nama lengkap"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="Masukkan email"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            value={formData.password}
                                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                            placeholder="Masukkan password"
                                            required
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4 text-gray-400" />
                                            ) : (
                                                <Eye className="h-4 w-4 text-gray-400" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="STAFF">Staff</SelectItem>
                                            <SelectItem value="MANAGER">Manager</SelectItem>
                                            <SelectItem value="OWNER">Owner</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Menambahkan...' : 'Tambah User'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowAddForm(false)}
                                >
                                    Batal
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Users List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Daftar User
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {users.length === 0 ? (
                        <div className="text-center py-8">
                            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">Belum ada user yang terdaftar</p>
                            <Button
                                onClick={loadUsers}
                                variant="outline"
                                className="mt-4"
                            >
                                Muat Ulang
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Mobile Card View */}
                            <div className="block sm:hidden space-y-4">
                                {users.map((user) => (
                                    <div key={user.id} className="border rounded-lg p-4 bg-white shadow-sm">
                                        <div className="flex flex-col items-center text-center space-y-3">
                                            <div className="w-full">
                                                <h3 className="font-semibold text-gray-900 text-lg">{user.name}</h3>
                                                <p className="text-sm text-gray-600 mt-1">{user.email}</p>
                                            </div>
                                            <div className="flex justify-center">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                                                    {getRoleLabel(user.role)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Bergabung: {new Date(user.createdAt).toLocaleDateString('id-ID')}
                                            </p>
                                            <div className="flex justify-center gap-3 pt-2 w-full">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEdit(user)}
                                                    className="flex-1 max-w-[120px]"
                                                >
                                                    <Edit2 className="h-4 w-4 mr-2" />
                                                    Edit
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex-1 max-w-[120px] text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Hapus
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="w-[95vw] max-w-lg mx-auto">
                                                        <AlertDialogHeader className="text-center sm:text-left">
                                                            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-center sm:text-left">
                                                                Apakah Anda yakin ingin menghapus user <strong>{user.name}</strong>?
                                                                Tindakan ini tidak dapat dibatalkan.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter className="gap-2 pt-4 flex-col sm:flex-row">
                                                            <AlertDialogCancel className="w-full sm:w-auto">Batal</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDelete(user)}
                                                                className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                                                            >
                                                                Hapus
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden sm:block">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    User
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Role
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Tanggal Bergabung
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Aksi
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {users.map((user) => (
                                                <tr key={user.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                            <div className="text-sm text-gray-500">{user.email}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                                                            {getRoleLabel(user.role)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(user.createdAt).toLocaleDateString('id-ID')}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handleEdit(user)}>
                                                                    <Edit2 className="h-4 w-4 mr-2" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <DropdownMenuItem onSelect={(e: Event) => e.preventDefault()} className="text-red-600">
                                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                                            Hapus
                                                                        </DropdownMenuItem>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent className="w-[95vw] max-w-lg mx-auto">
                                                                        <AlertDialogHeader className="text-center sm:text-left">
                                                                            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
                                                                            <AlertDialogDescription className="text-center sm:text-left">
                                                                                Apakah Anda yakin ingin menghapus user <strong>{user.name}</strong>?
                                                                                Tindakan ini tidak dapat dibatalkan.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter className="gap-2 pt-4 flex-col sm:flex-row">
                                                                            <AlertDialogCancel className="w-full sm:w-auto">Batal</AlertDialogCancel>
                                                                            <AlertDialogAction
                                                                                onClick={() => handleDelete(user)}
                                                                                className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                                                                            >
                                                                                Hapus
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit User Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="w-[95vw] max-w-md mx-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 justify-center sm:justify-start">
                            <Edit2 className="h-5 w-5" />
                            Edit User
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Nama Lengkap</Label>
                            <Input
                                id="edit-name"
                                type="text"
                                value={editFormData.name}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Masukkan nama lengkap"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                value={editFormData.email}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="Masukkan email"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-password">Password Baru (Opsional)</Label>
                            <div className="relative">
                                <Input
                                    id="edit-password"
                                    type={showPassword ? "text" : "password"}
                                    value={editFormData.password}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, password: e.target.value }))}
                                    placeholder="Kosongkan jika tidak ingin mengubah password"
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-gray-400" />
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-role">Role</Label>
                            <Select value={editFormData.role} onValueChange={(value) => setEditFormData(prev => ({ ...prev, role: value }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="STAFF">Staff</SelectItem>
                                    <SelectItem value="MANAGER">Manager</SelectItem>
                                    <SelectItem value="OWNER">Owner</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter className="gap-2 pt-4 flex-col sm:flex-row">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowEditDialog(false)}
                                disabled={loading}
                                className="w-full sm:w-auto"
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
