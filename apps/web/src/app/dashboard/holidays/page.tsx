'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Calendar, Trash2 } from 'lucide-react';
import { holidaysApi } from '@/lib/api/leaves';
import { formatDate, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/stores/auth-store';

export default function HolidaysPage() {
    const user = useAuthStore((state) => state.user);
    const isAdmin = ['COMPANY_ADMIN', 'HR_MANAGER'].includes(user?.role || '');
    const queryClient = useQueryClient();
    const [year, setYear] = useState(new Date().getFullYear());
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', date: '', type: 'NATIONAL' });

    const { data: holidays, isLoading } = useQuery({
        queryKey: ['holidays', year],
        queryFn: () => holidaysApi.getAll(year),
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => holidaysApi.create(data),
        onSuccess: () => {
            toast.success('Holiday created');
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
            setShowModal(false);
            setFormData({ name: '', date: '', type: 'NATIONAL' });
        },
        onError: () => toast.error('Failed to create holiday'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => holidaysApi.delete(id),
        onSuccess: () => {
            toast.success('Holiday deleted');
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
        },
        onError: () => toast.error('Failed to delete holiday'),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    // Group holidays by month
    const holidaysByMonth: Record<number, any[]> = {};
    holidays?.forEach((h: any) => {
        const month = new Date(h.date).getMonth();
        if (!holidaysByMonth[month]) holidaysByMonth[month] = [];
        holidaysByMonth[month].push(h);
    });

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Holidays</h1>
                    <p className="text-muted-foreground">Manage company holidays and closures</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="px-4 py-2.5 rounded-xl border bg-background input-focus-ring"
                    >
                        {[2024, 2025, 2026, 2027].map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    {isAdmin && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn-premium inline-flex items-center gap-2 px-5 py-2.5"
                        >
                            <Plus className="h-5 w-5" />
                            Add Holiday
                        </button>
                    )}
                </div>
            </div>

            {/* Summary */}
            <div className="grid sm:grid-cols-3 gap-4">
                <div className="stats-card">
                    <Calendar className="h-8 w-8 text-primary mb-3" />
                    <p className="text-2xl font-bold">{holidays?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Holidays</p>
                </div>
                <div className="stats-card">
                    <Calendar className="h-8 w-8 text-blue-600 mb-3" />
                    <p className="text-2xl font-bold">
                        {holidays?.filter((h: any) => h.type === 'NATIONAL').length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">National Holidays</p>
                </div>
                <div className="stats-card">
                    <Calendar className="h-8 w-8 text-purple-600 mb-3" />
                    <p className="text-2xl font-bold">
                        {holidays?.filter((h: any) => h.type === 'COMPANY').length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Company Holidays</p>
                </div>
            </div>

            {/* Holidays List */}
            <div className="glass-card rounded-2xl overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading...</div>
                ) : holidays?.length === 0 ? (
                    <div className="p-8 text-center">
                        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No holidays for {year}</p>
                        {isAdmin && (
                            <button
                                onClick={() => setShowModal(true)}
                                className="mt-4 text-primary font-medium hover:underline"
                            >
                                Add your first holiday
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="divide-y">
                        {Object.entries(holidaysByMonth).map(([monthIndex, monthHolidays]) => (
                            <div key={monthIndex}>
                                <div className="px-6 py-3 bg-muted/50 font-medium">
                                    {new Date(year, Number(monthIndex)).toLocaleString('default', { month: 'long' })}
                                </div>
                                <div className="divide-y">
                                    {monthHolidays.map((holiday: any) => (
                                        <div key={holiday.id} className="flex items-center justify-between px-6 py-4 table-row-hover">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    'h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold',
                                                    holiday.type === 'NATIONAL'
                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                )}>
                                                    {new Date(holiday.date).getDate()}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{holiday.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {formatDate(holiday.date, 'EEEE, MMMM d')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={cn(
                                                    'px-3 py-1 rounded-full text-xs font-medium',
                                                    holiday.type === 'NATIONAL'
                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                )}>
                                                    {holiday.type}
                                                </span>
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => deleteMutation.mutate(holiday.id)}
                                                        className="p-2 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-background rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-lg font-semibold mb-4">Add Holiday</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border bg-background input-focus-ring"
                                    placeholder="Christmas Day"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Date</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border bg-background input-focus-ring"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border bg-background input-focus-ring"
                                >
                                    <option value="NATIONAL">National Holiday</option>
                                    <option value="COMPANY">Company Holiday</option>
                                    <option value="OPTIONAL">Optional Holiday</option>
                                </select>
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
                                    {createMutation.isPending ? 'Adding...' : 'Add Holiday'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
