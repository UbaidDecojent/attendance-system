'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useForm, Controller } from 'react-hook-form';
import 'react-quill/dist/quill.snow.css';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { tasksApi, Task } from '@/lib/api/tasks';
import { projectsApi } from '@/lib/api/projects';
import { employeesApi } from '@/lib/api/employees';
import { motion, AnimatePresence } from 'framer-motion';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

// Searchable Multi-Select Component for Assignees
function AssigneeMultiSelect({
    employees,
    selectedIds,
    onChange
}: {
    employees: any[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredEmployees = employees.filter((emp: any) =>
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(search.toLowerCase())
    );

    const toggleEmployee = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter(sid => sid !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const removeEmployee = (id: string) => {
        onChange(selectedIds.filter(sid => sid !== id));
    };

    const selectedEmployees = employees.filter((emp: any) => selectedIds.includes(emp.id));

    return (
        <div ref={containerRef} className="relative">
            {/* Selected Chips & Input */}
            <div
                onClick={() => setIsOpen(true)}
                className={`min-h-[52px] px-3 py-2 rounded-xl border bg-zinc-900/50 cursor-text flex flex-wrap gap-2 transition-all ${isOpen ? 'border-lime ring-1 ring-lime' : 'border-white/10'}`}
            >
                {selectedEmployees.map((emp: any) => (
                    <span
                        key={emp.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-lime/20 text-lime text-sm font-medium rounded-lg"
                    >
                        {emp.firstName} {emp.lastName}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeEmployee(emp.id); }}
                            className="hover:bg-lime/30 rounded p-0.5 transition-colors"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    placeholder={selectedIds.length === 0 ? "Search and select assignees..." : ""}
                    className="flex-1 min-w-[120px] bg-transparent text-white text-sm outline-none placeholder:text-zinc-500"
                />
            </div>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-2 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                    >
                        <div className="max-h-48 overflow-y-auto">
                            {filteredEmployees.length === 0 ? (
                                <p className="text-zinc-500 text-sm text-center py-4">No employees found</p>
                            ) : (
                                filteredEmployees.map((emp: any) => {
                                    const isSelected = selectedIds.includes(emp.id);
                                    return (
                                        <button
                                            key={emp.id}
                                            type="button"
                                            onClick={() => toggleEmployee(emp.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left ${isSelected ? 'bg-lime/10' : ''}`}
                                        >
                                            <div className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-lime border-lime' : 'border-white/20 bg-zinc-800'}`}>
                                                {isSelected && <Check className="h-3 w-3 text-black" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-white">{emp.firstName} {emp.lastName}</span>
                                                <span className="text-xs text-zinc-500">{emp.designation?.name || 'Employee'}</span>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const taskSchema = z.object({
    name: z.string().min(3, 'Task name must be at least 3 characters'),
    projectId: z.string().min(1, 'Please select a project'),
    assigneeIds: z.array(z.string()).min(1, 'Select at least one assignee'),
    status: z.enum(['TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'ON_HOLD', 'COMPLETED', 'CLOSED']),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    billingType: z.enum(['BILLABLE', 'NON_BILLABLE']),
    startDate: z.string().optional(),
    dueDate: z.string().optional(),
    duration: z.string().optional(),
    description: z.string().optional(),
});

type TaskForm = z.infer<typeof taskSchema>;

interface CreateTaskSheetProps {
    isOpen: boolean;
    onClose: () => void;
    taskToEdit?: Task | null;
    parentTask?: Task | null; // If set, creating a subtask
}

export default function CreateTaskSheet({ isOpen, onClose, taskToEdit, parentTask }: CreateTaskSheetProps) {
    const [mounted, setMounted] = useState(false);
    const queryClient = useQueryClient();

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Fetch Projects
    const { data: projectsResponse } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectsApi.getAll()
    });
    const projects = Array.isArray(projectsResponse) ? projectsResponse : (projectsResponse as any)?.data || [];

    // Fetch Employees
    const { data: employeesResponse } = useQuery({
        queryKey: ['employees-list'],
        queryFn: () => employeesApi.getAll({})
    });
    const employees = Array.isArray(employeesResponse)
        ? employeesResponse
        : (employeesResponse as any)?.data || (employeesResponse as any)?.items || [];

    const {
        register,
        handleSubmit,
        control,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<TaskForm>({
        resolver: zodResolver(taskSchema),
        defaultValues: {
            status: 'TO_DO',
            priority: 'MEDIUM',
            billingType: 'NON_BILLABLE',
            assigneeIds: []
        }
    });

    // Populate form on edit
    useEffect(() => {
        if (isOpen && taskToEdit) {
            reset({
                name: taskToEdit.name,
                projectId: taskToEdit.projectId,
                status: taskToEdit.status,
                priority: taskToEdit.priority,
                billingType: taskToEdit.billingType,
                // Split T to get YYYY-MM-DD for date input
                startDate: taskToEdit.startDate ? taskToEdit.startDate.split('T')[0] : '',
                dueDate: taskToEdit.dueDate ? taskToEdit.dueDate.split('T')[0] : '',
                duration: taskToEdit.duration || '',
                description: taskToEdit.description || '',
                assigneeIds: taskToEdit.assignees?.map(a => a.id) || [],
            } as any);
        } else if (isOpen && !taskToEdit) {
            reset({
                name: '',
                projectId: parentTask?.projectId || '', // Pre-fill from parent task if creating subtask
                status: 'TO_DO',
                priority: 'MEDIUM',
                billingType: 'NON_BILLABLE',
                assigneeIds: [],
                startDate: '',
                dueDate: '',
                duration: '',
                description: ''
            });
        }
    }, [isOpen, taskToEdit, reset]);

    const assigneeIds = watch('assigneeIds');

    const mutation = useMutation({
        mutationFn: (data: TaskForm) => {
            if (taskToEdit) {
                return tasksApi.update(taskToEdit.id, data);
            }
            return tasksApi.create(data);
        },
        onSuccess: () => {
            toast.success(taskToEdit ? 'Task updated successfully' : 'Task created successfully');
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task'] });
            reset();
            onClose();
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || (taskToEdit ? 'Failed to update task' : 'Failed to create task'));
        },
    });

    const onSubmit = (data: TaskForm) => {
        // Sanitize dates and format to ISO-8601
        const payload = {
            ...data,
            startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
            dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
            parentTaskId: parentTask?.id, // Include parent task ID for subtasks
        };
        mutation.mutate(payload);
    };

    const toggleAssignee = (id: string) => {
        const current = assigneeIds || [];
        if (current.includes(id)) {
            setValue('assigneeIds', current.filter(cid => cid !== id));
        } else {
            setValue('assigneeIds', [...current, id]);
        }
    };

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-xl bg-[#0a0a0a] h-full border-l border-white/10 shadow-2xl flex flex-col"
                    >
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">{taskToEdit ? 'Edit Task' : 'New Task'}</h2>
                                <p className="text-zinc-400 text-sm mt-1">{taskToEdit ? 'Update task details' : 'Create a new task and assign to team'}</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form className="p-6 space-y-6 flex-1 overflow-y-auto">
                            {/* Task Name */}
                            <div>
                                <label className="text-sm font-semibold text-zinc-300 mb-2 block">Task Name <span className="text-lime">*</span></label>
                                <input
                                    type="text"
                                    {...register('name')}
                                    placeholder="e.g. Design Home Page"
                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900/50 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all placeholder:text-zinc-600 font-medium"
                                />
                                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                            </div>

                            {/* Project Field */}
                            <div>
                                <label className="text-sm font-semibold text-zinc-300 mb-2 block">Project <span className="text-lime">*</span></label>
                                <select
                                    {...register('projectId')}
                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900/50 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all appearance-none font-medium cursor-pointer"
                                    disabled={!!taskToEdit} // Disable Project change on Edit? Maybe allowed.
                                >
                                    <option value="">Select a project</option>
                                    {projects.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.title}</option>
                                    ))}
                                </select>
                                {errors.projectId && <p className="text-red-500 text-sm mt-1">{errors.projectId.message}</p>}
                            </div>

                            {/* Row 1: Priority, Status, Billing */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Priority</label>
                                    <select {...register('priority')} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900/50 text-white focus:outline-none focus:border-lime">
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="URGENT">Urgent</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Status</label>
                                    <select {...register('status')} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900/50 text-white focus:outline-none focus:border-lime">
                                        <option value="TO_DO">To Do</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="IN_REVIEW">In Review</option>
                                        <option value="ON_HOLD">On Hold</option>
                                        <option value="COMPLETED">Completed</option>
                                        <option value="CLOSED">Closed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Billing</label>
                                    <select {...register('billingType')} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900/50 text-white focus:outline-none focus:border-lime">
                                        <option value="BILLABLE">Billable</option>
                                        <option value="NON_BILLABLE">Non-Billable</option>
                                    </select>
                                </div>
                            </div>

                            {/* Row 2: Dates */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Start Date</label>
                                    <input type="date" {...register('startDate')} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900/50 text-white focus:outline-none focus:border-lime" />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Due Date</label>
                                    <input type="date" {...register('dueDate')} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900/50 text-white focus:outline-none focus:border-lime" />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Duration</label>
                                    <input type="text" {...register('duration')} placeholder="e.g. 2d 5h" className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900/50 text-white focus:outline-none focus:border-lime" />
                                </div>
                            </div>

                            {/* Assignees - Searchable Multi-Select */}
                            <div>
                                <label className="text-sm font-semibold text-zinc-300 mb-2 block">Assignees <span className="text-lime">*</span></label>
                                <AssigneeMultiSelect
                                    employees={employees}
                                    selectedIds={assigneeIds || []}
                                    onChange={(ids) => setValue('assigneeIds', ids)}
                                />
                                {errors.assigneeIds && <p className="text-red-500 text-sm mt-1">{errors.assigneeIds.message}</p>}
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
                                disabled={mutation.isPending}
                                className="px-8 py-3 bg-lime text-black rounded-xl font-bold hover:bg-lime/90 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                {taskToEdit ? 'Update Task' : 'Create Task'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
