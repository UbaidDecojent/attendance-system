'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Building2, Users, Pencil, Trash2 } from 'lucide-react';
import { departmentsApi } from '@/lib/api/employees';
import { useAuthStore } from '@/lib/stores/auth-store';
import api from '@/lib/api/client';
import { toast } from 'sonner';

export default function DepartmentsPage() {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editingDept, setEditingDept] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', code: '', description: '' });
    const user = useAuthStore((state) => state.user);
    const isAdmin = ['COMPANY_ADMIN', 'HR_MANAGER'].includes(user?.role || '');

    const { data: departments, isLoading } = useQuery({
        queryKey: ['departments'],
        queryFn: departmentsApi.getAll,
    });

    // Force fetch user data to ensure we have latest employee/department info
    const { data: freshUser } = useQuery({
        queryKey: ['auth-me'],
        queryFn: async () => {
            const res = await api.get('/auth/me');
            return res.data.data.user;
        },
        enabled: !isAdmin && !!user,
    });

    const currentUser = freshUser || user;

    const visibleDepartments = isAdmin
        ? departments
        : departments?.filter((d: any) => d.id === currentUser?.employee?.departmentId);

    const createMutation = useMutation({
        mutationFn: (data: any) => departmentsApi.create(data),
        onSuccess: () => {
            toast.success('Department created');
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            setShowModal(false);
            setFormData({ name: '', code: '', description: '' });
        },
        onError: () => toast.error('Failed to create department'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => departmentsApi.delete(id),
        onSuccess: () => {
            toast.success('Department deleted');
            queryClient.invalidateQueries({ queryKey: ['departments'] });
        },
        onError: () => toast.error('Failed to delete department'),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Departments</h1>
                    <p className="text-muted-foreground">Organize your company structure</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="btn-premium inline-flex items-center gap-2 px-5 py-2.5"
                    >
                        <Plus className="h-5 w-5" />
                        Add Department
                    </button>
                )}
            </div>

            {/* Departments Grid */}
            {isLoading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="stats-card animate-pulse">
                            <div className="h-12 w-12 bg-muted rounded-xl mb-4" />
                            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                            <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                    ))}
                </div>
            ) : departments?.length === 0 ? (
                <div className="text-center py-12 glass-card rounded-2xl">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No departments found</p>
                    {isAdmin && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="mt-4 text-primary font-medium hover:underline"
                        >
                            Create your first department
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visibleDepartments?.map((dept: any) => (
                        <div key={dept.id} className="stats-card group">
                            <div className="flex items-start justify-between">
                                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Building2 className="h-6 w-6 text-primary" />
                                </div>
                                {isAdmin && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 hover:bg-muted rounded-lg">
                                            <Pencil className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                        <button
                                            onClick={() => deleteMutation.mutate(dept.id)}
                                            className="p-2 hover:bg-red-100 hover:text-red-600 rounded-lg"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="mt-4">
                                <h3 className="font-semibold">{dept.name}</h3>
                                <p className="text-sm text-muted-foreground">Code: {dept.code}</p>
                            </div>
                            <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="h-4 w-4" />
                                <span>{dept._count?.employees || 0} employees</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-background rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-lg font-semibold mb-4">Create Department</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border bg-background input-focus-ring"
                                    placeholder="Engineering"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Code</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border bg-background input-focus-ring"
                                    placeholder="ENG"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Description (optional)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border bg-background input-focus-ring resize-none"
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 rounded-xl border font-medium hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="flex-1 btn-premium py-2.5"
                                >
                                    {createMutation.isPending ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
