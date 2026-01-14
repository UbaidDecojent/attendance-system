
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftsApi, Shift } from '@/lib/api/shifts';
import { toast } from 'sonner';
import { Clock, Plus, Trash2, Edit2, Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ShiftSettings() {
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const initialForm: Partial<Shift> = {
        name: '',
        code: '',
        startTime: '09:00',
        endTime: '18:00',
        breakDuration: 60,
        graceTimeIn: 15,
        graceTimeOut: 15,
        workingDays: [1, 2, 3, 4, 5],
        isDefault: false
    };

    const [formData, setFormData] = useState<Partial<Shift>>(initialForm);

    const { data: shifts, isLoading } = useQuery({
        queryKey: ['shifts'],
        queryFn: shiftsApi.getAll
    });

    const createMutation = useMutation({
        mutationFn: shiftsApi.create,
        onSuccess: () => {
            toast.success('Shift created successfully');
            setIsAdding(false);
            setFormData(initialForm);
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create shift');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Shift> }) => shiftsApi.update(id, data),
        onSuccess: () => {
            toast.success('Shift updated successfully');
            setEditingId(null);
            setFormData(initialForm);
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update shift');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: shiftsApi.delete,
        onSuccess: () => {
            toast.success('Shift deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete shift');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!formData.name || !formData.startTime || !formData.endTime) {
            toast.error('Please fill in all required fields');
            return;
        }

        // Clean payload - Only send updatable fields
        const payload = {
            name: formData.name,
            code: formData.code || formData.name?.toUpperCase().replace(/\s+/g, '_').substring(0, 10),
            description: formData.description,
            startTime: formData.startTime,
            endTime: formData.endTime,
            breakDuration: formData.breakDuration,
            graceTimeIn: formData.graceTimeIn,
            graceTimeOut: formData.graceTimeOut,
            workingDays: formData.workingDays,
            isDefault: formData.isDefault,
            isActive: formData.isActive
        };

        if (editingId) {
            updateMutation.mutate({ id: editingId, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const startEdit = (shift: Shift) => {
        setEditingId(shift.id);
        setFormData(shift);
        setIsAdding(true);
    };

    const cancelEdit = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData(initialForm);
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Shift Timings</h2>
                    <p className="text-sm text-zinc-500 font-medium">Configure office hours and lateness rules</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-lime hover:bg-lime-400 text-black px-6 py-2.5 rounded-full font-bold transition-all text-sm flex items-center gap-2 hover:scale-105"
                    >
                        <Plus className="h-4 w-4" />
                        Add Shift
                    </button>
                )}
            </div>

            {/* Form */}
            {isAdding && (
                <div className="bg-zinc-900/50 border border-white/5 rounded-[1.5rem] p-6 animate-in slide-in-from-top-4">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Shift Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime"
                                    placeholder="e.g. General Shift"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Code (Optional)</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime"
                                    placeholder="GEN_SHIFT"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Start Time</label>
                                <input
                                    type="time"
                                    value={formData.startTime}
                                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">End Time</label>
                                <input
                                    type="time"
                                    value={formData.endTime}
                                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Grace Time (Minutes)</label>
                                <input
                                    type="number"
                                    value={formData.graceTimeIn}
                                    onChange={e => setFormData({ ...formData, graceTimeIn: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime"
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-6">
                                <input
                                    type="checkbox"
                                    id="isDefault"
                                    checked={formData.isDefault}
                                    onChange={e => setFormData({ ...formData, isDefault: e.target.checked })}
                                    className="h-5 w-5 rounded border-white/10 bg-black text-lime focus:ring-lime"
                                />
                                <label htmlFor="isDefault" className="text-sm font-bold text-white cursor-pointer SELECT-NONE">
                                    Set as Default Shift
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-white/5">
                            <button
                                type="button"
                                onClick={cancelEdit}
                                className="px-6 py-2.5 rounded-full border border-white/10 hover:bg-white/5 text-white font-bold text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={createMutation.isPending || updateMutation.isPending}
                                className="bg-lime hover:bg-lime-400 text-black px-8 py-2.5 rounded-full font-bold transition-all text-sm disabled:opacity-50"
                            >
                                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingId ? 'Update Shift' : 'Create Shift')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="grid gap-4">
                {isLoading ? (
                    <div className="text-zinc-500 text-center py-8">Loading shifts...</div>
                ) : shifts?.length === 0 && !isAdding ? (
                    <div className="text-center py-12 bg-zinc-900/30 rounded-[1.5rem] border border-white/5 border-dashed">
                        <Clock className="h-10 w-10 text-zinc-700 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-white">No Shifts Found</h3>
                        <p className="text-zinc-500 mt-2">Create a shift to define office timings.</p>
                    </div>
                ) : (
                    shifts?.map((shift) => (
                        <div key={shift.id} className="bg-zinc-900/30 p-6 rounded-[1.5rem] flex items-center justify-between border border-white/5 hover:border-lime/30 transition-all group">
                            <div className="flex items-center gap-6">
                                <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center group-hover:bg-lime/10 group-hover:border-lime/20 transition-colors">
                                    <Clock className="h-6 w-6 text-zinc-500 group-hover:text-lime transition-colors" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-bold text-white text-lg group-hover:text-lime transition-colors">{shift.name}</h3>
                                        {shift.isDefault && (
                                            <span className="bg-lime/20 text-lime text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-lime/20">
                                                Default
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-zinc-500 font-medium">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-lime"></span>
                                            {shift.startTime} - {shift.endTime}
                                        </span>
                                        <span className="text-zinc-700 mx-1">•</span>
                                        <span>Grace: {shift.graceTimeIn}m</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => startEdit(shift)}
                                    className="h-10 w-10 rounded-xl bg-black border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('Are you sure you want to delete this shift?')) {
                                            deleteMutation.mutate(shift.id);
                                        }
                                    }}
                                    className="h-10 w-10 rounded-xl bg-black border border-white/5 flex items-center justify-center text-zinc-500 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
