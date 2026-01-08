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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search employees..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background input-focus-ring"
                    />
                </div>
                <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border bg-background input-focus-ring min-w-[180px]"
                >
                    <option value="">All Departments</option>
                    {(Array.isArray(departments) ? departments : departments?.items || []).map((dept: any) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border bg-background input-focus-ring min-w-[150px]"
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
                        <div key={i} className="stats-card animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-full bg-muted" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-muted rounded w-3/4" />
                                    <div className="h-3 bg-muted rounded w-1/2" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-12 glass-card rounded-2xl">
                    <div className="text-muted-foreground">No employees found</div>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((employee: any) => (
                        <Link
                            key={employee.id}
                            href={`/dashboard/employees/${employee.id}`}
                            className="stats-card group hover:border-primary/30"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-lg font-semibold">
                                        {getInitials(employee.firstName, employee.lastName)}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                                            {employee.firstName} {employee.lastName}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {employee.designation?.name || 'No designation'}
                                        </p>
                                        <span className={cn(
                                            'inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1',
                                            employee.isActive
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                        )}>
                                            {employee.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                                <button className="p-2 hover:bg-muted rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical className="h-5 w-5 text-muted-foreground" />
                                </button>
                            </div>

                            <div className="mt-4 pt-4 border-t space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Mail className="h-4 w-4" />
                                    <span className="truncate">{employee.email}</span>
                                </div>
                                {employee.department && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Building2 className="h-4 w-4" />
                                        <span>{employee.department.name}</span>
                                    </div>
                                )}
                                {employee.phone && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Phone className="h-4 w-4" />
                                        <span>{employee.phone}</span>
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {meta && (
                <div className="flex items-center justify-between glass-card rounded-xl p-4">
                    <p className="text-sm text-muted-foreground">
                        Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, meta.total)} of {meta.total} employees
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 hover:bg-muted rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className="px-3 py-1 bg-muted rounded-lg text-sm font-medium">
                            {page} / {meta.totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                            disabled={page === meta.totalPages}
                            className="p-2 hover:bg-muted rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
