'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useForm, Controller } from 'react-hook-form';
import 'react-quill/dist/quill.snow.css';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { timeLogsApi } from '@/lib/api/timelogs';
import { projectsApi } from '@/lib/api/projects';
import { tasksApi } from '@/lib/api/tasks';
import { motion, AnimatePresence } from 'framer-motion';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

const schema = z.object({
    projectId: z.string().min(1, 'Select a project'),
    taskId: z.string().min(1, 'Select a task'),
    date: z.string().min(1, 'Select a date'),
    duration: z.string().regex(/^(\d{1,2}):(\d{2})$/, 'Format must be HH:MM'),
    billingType: z.enum(['BILLABLE', 'NON_BILLABLE']),
    description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateTimeLogSheetProps {
    isOpen: boolean;
    onClose: () => void;
    logToEdit?: any;
}

export default function CreateTimeLogSheet({ isOpen, onClose, logToEdit }: CreateTimeLogSheetProps) {
    const [mounted, setMounted] = useState(false);
    const queryClient = useQueryClient();
    const { register, handleSubmit, control, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            billingType: 'BILLABLE', // Default
            date: new Date().toISOString().split('T')[0]
        }
    });

    const selectedProjectId = watch('projectId');

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Reset or Prefill
    useEffect(() => {
        if (isOpen) {
            if (logToEdit) {
                // Formatting Duration from minutes to HH:MM
                const h = Math.floor(logToEdit.durationMinutes / 60).toString().padStart(2, '0');
                const m = (logToEdit.durationMinutes % 60).toString().padStart(2, '0');

                reset({
                    projectId: logToEdit.projectId,
                    taskId: logToEdit.taskId,
                    date: logToEdit.date.split('T')[0],
                    duration: `${h}:${m}`,
                    billingType: logToEdit.billingType,
                    description: logToEdit.description
                });
            } else {
                reset({
                    billingType: 'BILLABLE',
                    date: new Date().toISOString().split('T')[0],
                    projectId: '',
                    taskId: '',
                    duration: '',
                    description: ''
                });
            }
        }
    }, [isOpen, logToEdit, reset]);

    // Fetch Projects
    const { data: projectsResponse } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectsApi.getAll()
    });
    const projects = Array.isArray(projectsResponse) ? projectsResponse : (projectsResponse as any)?.data || [];

    // Fetch Tasks
    const { data: tasksResponse } = useQuery({
        queryKey: ['tasks', selectedProjectId],
        queryFn: () => tasksApi.getAll({ projectId: selectedProjectId }),
        enabled: !!selectedProjectId || !!logToEdit?.projectId
    });
    const tasks = Array.isArray(tasksResponse) ? tasksResponse : (tasksResponse as any)?.data || [];

    const createMutation = useMutation({
        mutationFn: (data: FormValues) => timeLogsApi.create(data),
        onSuccess: () => {
            toast.success('Time log added successfully');
            queryClient.invalidateQueries({ queryKey: ['time-logs'] });
            reset();
            onClose();
        },
        onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to add time log')
    });

    const updateMutation = useMutation({
        mutationFn: (data: FormValues) => timeLogsApi.update(logToEdit.id, data),
        onSuccess: () => {
            toast.success('Time log updated successfully');
            queryClient.invalidateQueries({ queryKey: ['time-logs'] });
            reset();
            onClose();
        },
        onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to update time log')
    });

    const onSubmit = (data: FormValues) => {
        if (logToEdit) {
            updateMutation.mutate(data);
        } else {
            createMutation.mutate(data);
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-xl bg-[#0a0a0a] h-full border-l border-white/10 shadow-2xl flex flex-col"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">
                                    {logToEdit ? 'Edit Time Log' : 'Add Time Log'}
                                </h2>
                                <p className="text-zinc-400 text-sm mt-1">
                                    {logToEdit ? 'Update your time log details' : 'Log your work hours for a task'}
                                </p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form className="p-6 space-y-6 flex-1 overflow-y-auto">
                            {/* Project & Task */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Project <span className="text-lime">*</span></label>
                                    <select {...register('projectId')} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900/50 text-white focus:outline-none focus:border-lime">
                                        <option value="">Select Project</option>
                                        {projects.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.title}</option>
                                        ))}
                                    </select>
                                    {errors.projectId && <p className="text-red-500 text-sm mt-1">{errors.projectId.message}</p>}
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Task <span className="text-lime">*</span></label>
                                    <select {...register('taskId')} disabled={!selectedProjectId} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900/50 text-white focus:outline-none focus:border-lime disabled:opacity-50">
                                        <option value="">Select Task</option>
                                        {tasks.map((t: any) => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                    {errors.taskId && <p className="text-red-500 text-sm mt-1">{errors.taskId.message}</p>}
                                </div>
                            </div>

                            {/* Date, Duration, Billing */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Date <span className="text-lime">*</span></label>
                                    <input type="date" {...register('date')} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900/50 text-white focus:outline-none focus:border-lime" />
                                    {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Time (HH:MM) <span className="text-lime">*</span></label>
                                    <input type="text" {...register('duration')} placeholder="08:00" className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900/50 text-white focus:outline-none focus:border-lime" />
                                    {errors.duration && <p className="text-red-500 text-sm mt-1">{errors.duration.message}</p>}
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Billing</label>
                                    <select {...register('billingType')} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900/50 text-white focus:outline-none focus:border-lime">
                                        <option value="BILLABLE">Billable</option>
                                        <option value="NON_BILLABLE">Non-Billable</option>
                                    </select>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-sm font-semibold text-zinc-300 mb-2 block">Description</label>
                                <div className="h-48">
                                    <div className="h-full rounded-xl border border-white/10 bg-zinc-900/50 overflow-hidden
                                        [&_.ql-toolbar]:!border-0 [&_.ql-toolbar]:!border-b [&_.ql-toolbar]:!border-white/10 [&_.ql-toolbar]:!bg-zinc-800/30
                                        [&_.ql-container]:!border-0
                                        [&_.ql-editor]:!text-zinc-200 [&_.ql-editor]:!text-sm [&_.ql-editor]:!font-medium
                                        [&_.ql-stroke]:!stroke-zinc-400 
                                        [&_.ql-fill]:!fill-zinc-400
                                        [&_.ql-picker]:!text-zinc-400 
                                        [&_.ql-picker-options]:!bg-[#18181b] [&_.ql-picker-options]:!border-white/10
                                        [&_.ql-picker-item]:!text-zinc-400
                                        [&_button:hover_.ql-stroke]:!stroke-white
                                        [&_button:hover_.ql-fill]:!fill-white
                                        [&_.ql-active_.ql-stroke]:!stroke-lime 
                                        [&_.ql-active_.ql-fill]:!fill-lime"
                                    >
                                        <Controller
                                            name="description"
                                            control={control}
                                            render={({ field }) => (
                                                <ReactQuill
                                                    theme="snow"
                                                    value={field.value || ''}
                                                    onChange={field.onChange}
                                                    className="h-full flex flex-col [&_.ql-container]:flex-1 [&_.ql-editor]:h-full"
                                                />
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>
                        </form>

                        <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-[#0a0a0a]">
                            <button onClick={onClose} className="px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-medium text-white">Cancel</button>
                            <button
                                onClick={handleSubmit(onSubmit)}
                                disabled={isPending}
                                className="px-8 py-3 bg-lime text-black rounded-xl font-bold hover:bg-lime/90 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                {logToEdit ? 'Update Log' : 'Add Time Log'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
