'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { toast } from 'sonner';
import {
    Plus,
    Search,
    MoreVertical,
    Mail,
    Phone,
    Building2,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { employeesApi, departmentsApi } from '@/lib/api/employees';
import { cn, getInitials } from '@/lib/utils';
import Link from 'next/link';

export default function EmployeesPage() {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const isAdmin = ['COMPANY_ADMIN', 'HR_MANAGER'].includes(user?.role || '');

    useEffect(() => {
        if (user && !isAdmin) {
            toast.error('Unauthorized access');
            router.push('/dashboard');
        }
    }, [user, isAdmin, router]);

    if (!isAdmin) return null;

    const [search, setSearch] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    const [page, setPage] = useState(1);

    const { data: employeesResponse, isLoading } = useQuery({
        queryKey: ['employees', search, departmentFilter, statusFilter, page],
        queryFn: () => employeesApi.getAll({
            search,
            departmentId: departmentFilter || undefined,
            status: statusFilter,
            page,
            limit: 10,
        }),
    });

    const { data: departments } = useQuery({
        queryKey: ['departments'],
        queryFn: departmentsApi.getAll,
    });

    // Normalize the data structure
    // API TransformInterceptor returns: { success: true, data: [...items], meta: {...} }
    const { items, meta } = useMemo(() => {
        if (!employeesResponse) {
            return { items: [], meta: null };
        }

        let items = [];
        let meta = null;

        // TransformInterceptor format: { success: true, data: [...], meta: {...} }
        if (Array.isArray(employeesResponse.data)) {
            items = employeesResponse.data;
            meta = employeesResponse.meta;
        } else if (Array.isArray(employeesResponse)) {
            items = employeesResponse;
        } else if (employeesResponse.items) {
            items = employeesResponse.items;
            meta = employeesResponse.meta;
        }

        return { items, meta };
    }, [employeesResponse]);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Employees</h1>
                    <p className="text-muted-foreground">Manage your team members</p>
                </div>
                <Link
                    href="/dashboard/employees/new"
                    className="btn-premium inline-flex items-center gap-2 px-5 py-2.5"
                >
                    <Plus className="h-5 w-5" />
                    Add Employee
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search employees..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-full border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all placeholder:text-zinc-600"
                    />
                </div>
                <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="px-6 py-3 rounded-full border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all min-w-[180px]"
                >
                    <option value="">All Departments</option>
                    {(Array.isArray(departments) ? departments : departments?.items || []).map((dept: any) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-6 py-3 rounded-full border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all min-w-[150px]"
                >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="all">All</option>
                </select>
            </div>

            {/* Employees Grid */}
            {isLoading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-[#111111] border border-white/5 rounded-[1.5rem] p-6 animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-full bg-zinc-900" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-zinc-900 rounded w-3/4" />
                                    <div className="h-3 bg-zinc-900 rounded w-1/2" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-12 bg-[#111111] border border-white/5 rounded-[1.5rem]">
                    <div className="text-zinc-500 font-medium">No employees found matching your criteria.</div>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((employee: any) => (
                        <Link
                            key={employee.id}
                            href={`/dashboard/employees/${employee.id}`}
                            className="bg-[#111111] border border-white/5 rounded-[1.5rem] p-6 group hover:border-lime/30 transition-all hover:translate-y-[-2px] hover:shadow-2xl hover:shadow-black"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-white text-lg font-bold group-hover:border-lime/30 group-hover:text-lime transition-all">
                                        {getInitials(employee.firstName, employee.lastName)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white group-hover:text-lime transition-colors">
                                            {employee.firstName} {employee.lastName}
                                        </h3>
                                        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mt-0.5">
                                            {employee.designation?.name || 'No designation'}
                                        </p>
                                        <span className={cn(
                                            'inline-flex items-center mt-2 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border',
                                            employee.isActive
                                                ? 'bg-lime/10 text-lime border-lime/20'
                                                : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                                        )}>
                                            {employee.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                                <button className="p-2 rounded-full hover:bg-zinc-900 text-zinc-600 hover:text-white transition-colors">
                                    <MoreVertical className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                                <div className="flex items-center gap-3 text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                                    <div className="p-2 rounded-full bg-zinc-900 text-zinc-500 group-hover:text-lime group-hover:bg-lime/10 transition-colors">
                                        <Mail className="h-4 w-4" />
                                    </div>
                                    <span className="truncate font-medium">{employee.email}</span>
                                </div>
                                {employee.department && (
                                    <div className="flex items-center gap-3 text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                                        <div className="p-2 rounded-full bg-zinc-900 text-zinc-500 group-hover:text-lime group-hover:bg-lime/10 transition-colors">
                                            <Building2 className="h-4 w-4" />
                                        </div>
                                        <span className="font-medium">{employee.department.name}</span>
                                    </div>
                                )}
                                {employee.phone && (
                                    <div className="flex items-center gap-3 text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                                        <div className="p-2 rounded-full bg-zinc-900 text-zinc-500 group-hover:text-lime group-hover:bg-lime/10 transition-colors">
                                            <Phone className="h-4 w-4" />
                                        </div>
                                        <span className="font-medium">{employee.phone}</span>
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {meta && (
                <div className="flex items-center justify-between bg-[#111111] border border-white/5 rounded-[1.5rem] p-4">
                    <p className="text-sm font-medium text-zinc-500">
                        Showing <span className="text-white">{((page - 1) * 10) + 1}</span> to <span className="text-white">{Math.min(page * 10, meta.total)}</span> of <span className="text-white">{meta.total}</span> employees
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className="px-4 py-1.5 bg-zinc-900 border border-white/10 rounded-full text-xs font-bold text-white">
                            {page} / {meta.totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                            disabled={page === meta.totalPages}
                            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
