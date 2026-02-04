'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useForm, Controller } from 'react-hook-form';
import 'react-quill/dist/quill.snow.css';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, ChevronDown, Check, Briefcase, ListTodo, Circle, Search } from 'lucide-react';
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

    const [isProjectSelectOpen, setIsProjectSelectOpen] = useState(false);
    const [isTaskSelectOpen, setIsTaskSelectOpen] = useState(false);
    const projectSelectRef = useRef<HTMLDivElement>(null);
    const taskSelectRef = useRef<HTMLDivElement>(null);

    const selectedProjectId = watch('projectId');
    const selectedTaskId = watch('taskId');

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (taskSelectRef.current && !taskSelectRef.current.contains(event.target as Node)) {
                setIsTaskSelectOpen(false);
            }
            if (projectSelectRef.current && !projectSelectRef.current.contains(event.target as Node)) {
                setIsProjectSelectOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Fetch task details if only taskId is provided (for pre-filling project)
    const { data: prefillTask } = useQuery({
        queryKey: ['task', logToEdit?.taskId],
        queryFn: () => tasksApi.getOne(logToEdit.taskId),
        enabled: !!logToEdit?.taskId && !logToEdit?.projectId && isOpen
    });

    // Reset or Prefill
    useEffect(() => {
        if (isOpen) {
            if (logToEdit?.id) {
                // EDIT MODE: Existing log
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
            } else if (logToEdit?.taskId || prefillTask) {
                // CREATE MODE: Pre-filled from URL
                // If we fetched the task, use its projectId
                const projectId = logToEdit?.projectId || prefillTask?.projectId || '';

                reset({
                    billingType: 'BILLABLE',
                    date: new Date().toISOString().split('T')[0],
                    projectId: projectId,
                    taskId: logToEdit?.taskId || prefillTask?.id || '',
                    duration: '',
                    description: ''
                });
            } else {
                // CREATE MODE: Blank
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
    }, [isOpen, logToEdit, prefillTask, reset]);

    // Fetch Projects
    const { data: projectsResponse } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectsApi.getAll()
    });
    const projects = Array.isArray(projectsResponse) ? projectsResponse : (projectsResponse as any)?.data || [];

    // Fetch Tasks
    const { data: tasksResponse } = useQuery({
        queryKey: ['tasks', selectedProjectId],
        queryFn: () => tasksApi.getAll({ projectId: selectedProjectId, includeSubtasks: true }),
        enabled: !!selectedProjectId || !!logToEdit?.projectId
    });
    const tasks = Array.isArray(tasksResponse) ? tasksResponse : (tasksResponse as any)?.data || [];

    // Structured tasks for custom dropdown
    const structuredTasks = useMemo(() => {
        const parents = tasks.filter((t: any) => !t.parentTaskId);
        const subtasks = tasks.filter((t: any) => t.parentTaskId);

        // Map hierarchy
        return parents.map((parent: any) => {
            const children = subtasks.filter((s: any) => s.parentTaskId === parent.id);
            return {
                ...parent,
                children
            };
        }).sort((a: any, b: any) => a.name.localeCompare(b.name));
    }, [tasks]);

    // Find selected task name for display
    const selectedTaskLabel = useMemo(() => {
        if (!selectedTaskId) return 'Select Task';
        const task = tasks.find((t: any) => t.id === selectedTaskId);
        return task ? task.name : 'Select Task';
    }, [selectedTaskId, tasks]);

    // Find selected project name for display
    const selectedProjectLabel = useMemo(() => {
        if (!selectedProjectId) return 'Select Project';
        const project = projects.find((p: any) => p.id === selectedProjectId);
        return project ? project.title : 'Select Project';
    }, [selectedProjectId, projects]);

    const createMutation = useMutation({
        mutationFn: (data: FormValues) => timeLogsApi.create(data),
        onSuccess: () => {
            toast.success('Time log added successfully');
            queryClient.invalidateQueries({ queryKey: ['time-logs'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task'] });
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
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task'] });
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
                            <div className="space-y-4">
                                <div ref={projectSelectRef} className="relative">
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Project <span className="text-lime">*</span></label>

                                    {/* Trigger */}
                                    <button
                                        type="button"
                                        onClick={() => setIsProjectSelectOpen(!isProjectSelectOpen)}
                                        className={`w-full px-4 py-3 rounded-xl border flex items-center justify-between transition-all duration-200 ${isProjectSelectOpen ? 'border-lime ring-1 ring-lime/20 bg-zinc-900' : 'border-white/10 bg-zinc-900/50 hover:bg-zinc-900 hover:border-white/20'
                                            } cursor-pointer text-left text-white group`}
                                    >
                                        <span className={`block truncate ${!selectedProjectId ? 'text-zinc-500' : ''}`}>
                                            {selectedProjectLabel}
                                        </span>
                                        <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform duration-200 ${isProjectSelectOpen ? 'rotate-180' : 'group-hover:text-zinc-300'}`} />
                                    </button>

                                    {errors.projectId && <p className="text-red-500 text-sm mt-1">{errors.projectId.message}</p>}

                                    {/* Dropdown Menu */}
                                    <AnimatePresence>
                                        {isProjectSelectOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                                className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-white/10 bg-[#121214] shadow-2xl ring-1 ring-black/20 overflow-hidden flex flex-col max-h-[400px]"
                                            >
                                                <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                                                    {projects.length === 0 ? (
                                                        <div className="py-4 text-center text-zinc-500 text-sm">No projects available</div>
                                                    ) : (
                                                        projects.map((p: any) => (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setValue('projectId', p.id);
                                                                    setValue('taskId', ''); // Reset task on project change
                                                                    setIsProjectSelectOpen(false);
                                                                }}
                                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${selectedProjectId === p.id
                                                                    ? 'bg-zinc-800 text-white'
                                                                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                                                                    }`}
                                                            >
                                                                <div className={`shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-colors ${selectedProjectId === p.id ? 'border-lime bg-lime text-black' : 'border-zinc-700 bg-transparent'
                                                                    }`}>
                                                                    {selectedProjectId === p.id && <Check className="h-3 w-3" />}
                                                                </div>

                                                                <span className="truncate font-medium">{p.title}</span>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Premium Task Combobox */}
                                <div ref={taskSelectRef} className="relative">
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Task <span className="text-lime">*</span></label>

                                    {/* Trigger */}
                                    <button
                                        type="button"
                                        disabled={!selectedProjectId}
                                        onClick={() => setIsTaskSelectOpen(!isTaskSelectOpen)}
                                        className={`w-full px-4 py-3 rounded-xl border flex items-center justify-between transition-all duration-200 ${isTaskSelectOpen ? 'border-lime ring-1 ring-lime/20 bg-zinc-900' : 'border-white/10 bg-zinc-900/50 hover:bg-zinc-900 hover:border-white/20'
                                            } ${!selectedProjectId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} text-left text-white group`}
                                    >
                                        <span className={`block truncate ${!selectedTaskId ? 'text-zinc-500' : ''}`}>
                                            {selectedTaskLabel}
                                        </span>
                                        <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform duration-200 ${isTaskSelectOpen ? 'rotate-180' : 'group-hover:text-zinc-300'}`} />
                                    </button>

                                    {errors.taskId && <p className="text-red-500 text-sm mt-1">{errors.taskId.message}</p>}

                                    {/* Dropdown Menu */}
                                    <AnimatePresence>
                                        {isTaskSelectOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                                className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-white/10 bg-[#121214] shadow-2xl ring-1 ring-black/20 overflow-hidden flex flex-col max-h-[400px]"
                                            >
                                                {/* Scrollable List */}
                                                <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                                                    {structuredTasks.length === 0 ? (
                                                        <div className="py-8 text-center">
                                                            <div className="text-zinc-600 text-sm mb-1">No tasks found</div>
                                                            <div className="text-zinc-700 text-xs">Try selecting a different project</div>
                                                        </div>
                                                    ) : (
                                                        structuredTasks.map((parent: any) => (
                                                            <div key={parent.id}>
                                                                {/* Parent Task */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setValue('taskId', parent.id);
                                                                        setIsTaskSelectOpen(false);
                                                                    }}
                                                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${selectedTaskId === parent.id
                                                                        ? 'bg-zinc-800 text-white'
                                                                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                                                                        }`}
                                                                >
                                                                    <div className={`shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-colors ${selectedTaskId === parent.id ? 'border-lime bg-lime text-black' : 'border-zinc-700 bg-transparent'
                                                                        }`}>
                                                                        {selectedTaskId === parent.id && <Check className="h-3 w-3" />}
                                                                    </div>

                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <Briefcase className={`h-4 w-4 shrink-0 ${selectedTaskId === parent.id ? 'text-lime' : 'text-zinc-600 group-hover:text-zinc-500'}`} />
                                                                        <span className="truncate font-medium">{parent.name}</span>
                                                                    </div>
                                                                </button>

                                                                {/* Subtasks Tree */}
                                                                {parent.children && parent.children.length > 0 && (
                                                                    <div className="relative ml-5 pl-4 border-l border-zinc-800 my-1 space-y-0.5">
                                                                        {parent.children.map((subtask: any) => (
                                                                            <button
                                                                                key={subtask.id}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setValue('taskId', subtask.id);
                                                                                    setIsTaskSelectOpen(false);
                                                                                }}
                                                                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all group ${selectedTaskId === subtask.id
                                                                                    ? 'bg-zinc-800/80 text-white'
                                                                                    : 'text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300'
                                                                                    }`}
                                                                            >
                                                                                <div className={`shrink-0 w-3 h-3 rounded-full border transition-colors ${selectedTaskId === subtask.id ? 'border-lime bg-lime' : 'border-zinc-700 bg-transparent'
                                                                                    }`} />
                                                                                <div className="flex items-center gap-2 min-w-0">
                                                                                    <span className="truncate">{subtask.name}</span>
                                                                                </div>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
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
                                    <div className="relative">
                                        <select {...register('billingType')} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900/50 text-white focus:outline-none focus:border-lime appearance-none">
                                            <option value="BILLABLE">Billable</option>
                                            <option value="NON_BILLABLE">Non-Billable</option>
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                                    </div>
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
