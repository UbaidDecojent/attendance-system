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
                        className="bg-lime hover:bg-lime-400 text-black inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all hover:scale-105"
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
                        <div key={i} className="bg-[#111111] rounded-[1.5rem] p-6 animate-pulse border border-white/5">
                            <div className="h-12 w-12 bg-zinc-900 rounded-2xl mb-4" />
                            <div className="h-4 bg-zinc-900 rounded w-3/4 mb-2" />
                            <div className="h-3 bg-zinc-900 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            ) : departments?.length === 0 ? (
                <div className="text-center py-16 bg-[#111111] rounded-[2rem] border border-white/5 border-dashed">
                    <Building2 className="h-16 w-16 mx-auto text-zinc-600 mb-6" />
                    <p className="text-zinc-500 font-medium text-lg">No departments found</p>
                    {isAdmin && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="mt-4 text-lime font-bold hover:underline"
                        >
                            Create your first department
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visibleDepartments?.map((dept: any) => (
                        <div key={dept.id} className="bg-[#111111] border border-white/5 rounded-[1.5rem] p-6 hover:border-lime/30 group transition-all duration-300">
                            <div className="flex items-start justify-between">
                                <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center group-hover:bg-lime/10 group-hover:border-lime/20 transition-colors">
                                    <Building2 className="h-7 w-7 text-zinc-500 group-hover:text-lime transition-colors" />
                                </div>
                                {isAdmin && (
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors">
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => deleteMutation.mutate(dept.id)}
                                            className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg text-zinc-500 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="mt-6">
                                <h3 className="font-bold text-white text-xl">{dept.name}</h3>
                                <p className="text-sm text-zinc-500 font-medium mt-1">Code: {dept.code}</p>
                            </div>
                            <div className="mt-6 pt-6 border-t border-white/5 flex items-center gap-2 text-sm text-zinc-400 font-medium">
                                <Users className="h-4 w-4" />
                                <span>{dept._count?.employees || 0} employees</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#111111] border border-white/10 rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold text-white mb-6">Create Department</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all placeholder:text-zinc-600"
                                    placeholder="e.g. Engineering"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Code</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all placeholder:text-zinc-600"
                                    placeholder="e.g. ENG"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Description (optional)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all resize-none placeholder:text-zinc-600"
                                    rows={3}
                                    placeholder="Brief description of the department..."
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 rounded-xl border border-white/10 font-bold text-white hover:bg-zinc-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="flex-1 bg-lime hover:bg-lime-400 text-black rounded-xl font-bold transition-all disabled:opacity-50"
                                >
                                    {createMutation.isPending ? 'Creating...' : 'Create Department'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
