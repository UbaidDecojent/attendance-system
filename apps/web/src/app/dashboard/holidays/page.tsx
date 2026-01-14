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
                        className="px-6 py-2.5 rounded-full border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all"
                    >
                        {[2024, 2025, 2026, 2027].map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    {isAdmin && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-lime hover:bg-lime-400 text-black inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all hover:scale-105"
                        >
                            <Plus className="h-5 w-5" />
                            Add Holiday
                        </button>
                    )}
                </div>
            </div>

            {/* Summary */}
            <div className="grid sm:grid-cols-3 gap-4">
                {[
                    { label: 'Total Holidays', value: holidays?.length || 0, icon: Calendar },
                    { label: 'National Holidays', value: holidays?.filter((h: any) => h.type === 'NATIONAL').length || 0, icon: Calendar },
                    { label: 'Company Holidays', value: holidays?.filter((h: any) => h.type === 'COMPANY').length || 0, icon: Calendar },
                ].map((stat, i) => (
                    <div key={i} className="bg-[#111111] border border-white/5 rounded-[1.5rem] p-6 flex flex-col justify-between">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 rounded-full bg-zinc-900 border border-white/5 text-lime">
                                <stat.icon className="h-6 w-6" />
                            </div>
                            <span className="text-4xl font-extrabold text-white tracking-tighter">{stat.value}</span>
                        </div>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Holidays List */}
            <div className="bg-[#111111] border border-white/5 rounded-[2rem] overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center text-zinc-500 animate-pulse">Loading holidays...</div>
                ) : holidays?.length === 0 ? (
                    <div className="p-12 text-center">
                        <Calendar className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
                        <p className="text-zinc-500 font-medium">No holidays found for {year}.</p>
                        {isAdmin && (
                            <button
                                onClick={() => setShowModal(true)}
                                className="mt-4 text-lime font-bold hover:underline"
                            >
                                Add your first holiday
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {Object.entries(holidaysByMonth).map(([monthIndex, monthHolidays]) => (
                            <div key={monthIndex}>
                                <div className="px-8 py-4 bg-zinc-900/50 border-b border-white/5 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                    {new Date(year, Number(monthIndex)).toLocaleString('default', { month: 'long' })}
                                </div>
                                <div className="divide-y divide-white/5">
                                    {monthHolidays.map((holiday: any) => (
                                        <div key={holiday.id} className="flex items-center justify-between px-8 py-6 hover:bg-white/[0.02] transition-colors group">
                                            <div className="flex items-center gap-6">
                                                <div className={cn(
                                                    'h-12 w-12 rounded-2xl flex items-center justify-center text-lg font-bold border',
                                                    holiday.type === 'NATIONAL'
                                                        ? 'bg-lime/10 text-lime border-lime/20'
                                                        : 'bg-zinc-800 text-zinc-400 border-white/5'
                                                )}>
                                                    {new Date(holiday.date).getDate()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-lg">{holiday.name}</p>
                                                    <p className="text-sm text-zinc-500 font-medium">
                                                        {formatDate(holiday.date, 'EEEE, MMMM d')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className={cn(
                                                    'px-3 py-1 rounded-lg text-xs font-bold border uppercase tracking-wider',
                                                    holiday.type === 'NATIONAL'
                                                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                        : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                )}>
                                                    {holiday.type}
                                                </span>
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => deleteMutation.mutate(holiday.id)}
                                                        className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors text-zinc-600"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#111111] border border-white/10 rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold text-white mb-6">Add Holiday</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all placeholder:text-zinc-600"
                                    placeholder="e.g. Christmas Day"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Date</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all"
                                >
                                    <option value="NATIONAL">National Holiday</option>
                                    <option value="COMPANY">Company Holiday</option>
                                    <option value="OPTIONAL">Optional Holiday</option>
                                </select>
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
