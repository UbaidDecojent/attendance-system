'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Calendar, Clock, Briefcase, FileText, Plus, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { dailyUpdatesApi, DailyUpdate, AssignedProject, BillingType, ProjectType } from '@/lib/api/daily-updates';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface DailyUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingUpdate?: DailyUpdate | null;
}

export function DailyUpdateModal({ isOpen, onClose, editingUpdate }: DailyUpdateModalProps) {
    const queryClient = useQueryClient();

    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [selectedTaskId, setSelectedTaskId] = useState('');
    const [hoursWorked, setHoursWorked] = useState('');
    const [deadline, setDeadline] = useState('');
    const [billingType, setBillingType] = useState<BillingType>('BILLABLE');
    const [projectType, setProjectType] = useState<ProjectType>('CLIENT');
    const [notes, setNotes] = useState('');

    // Dropdown states
    const [isProjectSelectOpen, setIsProjectSelectOpen] = useState(false);
    const [isTaskSelectOpen, setIsTaskSelectOpen] = useState(false);
    const projectSelectRef = useRef<HTMLDivElement>(null);
    const taskSelectRef = useRef<HTMLDivElement>(null);

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

    // Fetch assigned projects
    const { data: assignedProjects, isLoading: loadingProjects } = useQuery({
        queryKey: ['assignedProjects'],
        queryFn: dailyUpdatesApi.getAssignedProjects,
        enabled: isOpen
    });

    // Get tasks for selected project
    const projectsList = Array.isArray(assignedProjects) ? assignedProjects : [];
    const selectedProject = projectsList.find(p => p.id === selectedProjectId);
    const availableTasks = selectedProject?.tasks || [];

    // Structured tasks for hierarchical dropdown (parent + subtasks)
    const structuredTasks = useMemo(() => {
        // For now, tasks from assignedProjects don't have parentTaskId, 
        // so we show them as flat list. If subtasks are added later, this will support hierarchy.
        const allTasks = availableTasks;
        const parents = allTasks.filter((t: any) => !t.parentTaskId);
        const subtasks = allTasks.filter((t: any) => t.parentTaskId);

        return parents.map((parent: any) => {
            const children = subtasks.filter((s: any) => s.parentTaskId === parent.id);
            return {
                ...parent,
                children
            };
        }).sort((a: any, b: any) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
    }, [availableTasks]);

    // Find selected labels for display
    const selectedProjectLabel = useMemo(() => {
        if (!selectedProjectId) return 'Select a project...';
        const project = projectsList.find((p: any) => p.id === selectedProjectId);
        return project ? `${project.title}${project.clientName ? ` (${project.clientName})` : ''}` : 'Select a project...';
    }, [selectedProjectId, projectsList]);

    const selectedTaskLabel = useMemo(() => {
        if (!selectedTaskId) return 'Select a task...';
        const task = availableTasks.find((t: any) => t.id === selectedTaskId);
        return task ? (task.title || task.name) : 'Select a task...';
    }, [selectedTaskId, availableTasks]);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            if (editingUpdate) {
                setSelectedProjectId(editingUpdate.projectId);
                setSelectedTaskId(editingUpdate.taskId);
                setHoursWorked(editingUpdate.hoursWorked.toString());
                setDeadline(editingUpdate.deadline ? format(new Date(editingUpdate.deadline), 'yyyy-MM-dd') : '');
                setBillingType(editingUpdate.billingType);
                setProjectType(editingUpdate.projectType);
                setNotes(editingUpdate.notes || '');
            } else {
                setSelectedProjectId('');
                setSelectedTaskId('');
                setHoursWorked('');
                setDeadline('');
                setBillingType('BILLABLE');
                setProjectType('CLIENT');
                setNotes('');
            }
        }
    }, [isOpen, editingUpdate]);

    // Reset task when project changes
    useEffect(() => {
        if (!editingUpdate) {
            setSelectedTaskId('');
        }
    }, [selectedProjectId, editingUpdate]);

    const createMutation = useMutation({
        mutationFn: dailyUpdatesApi.create,
        onSuccess: () => {
            toast.success('Daily update added successfully!');
            queryClient.invalidateQueries({ queryKey: ['myDailyUpdates'] });
            onClose();
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to add daily update');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => dailyUpdatesApi.update(id, data),
        onSuccess: () => {
            toast.success('Daily update updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['myDailyUpdates'] });
            onClose();
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to update daily update');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedProjectId || !selectedTaskId || !hoursWorked) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (editingUpdate) {
            // For update, don't send projectId and taskId
            const updateData = {
                hoursWorked: parseFloat(hoursWorked),
                deadline: deadline || undefined,
                billingType,
                projectType,
                notes: notes || undefined
            };
            updateMutation.mutate({ id: editingUpdate.id, data: updateData });
        } else {
            // For create, send all fields including projectId and taskId
            const createData = {
                projectId: selectedProjectId,
                taskId: selectedTaskId,
                hoursWorked: parseFloat(hoursWorked),
                deadline: deadline || undefined,
                billingType,
                projectType,
                notes: notes || undefined
            };
            createMutation.mutate(createData);
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ margin: 0 }}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 bg-[#111111] border border-white/10 rounded-2xl w-[30%] min-w-[400px] shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Plus className="h-5 w-5 text-lime" />
                        {editingUpdate ? 'Edit Daily Update' : 'Add Daily Update'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X className="h-5 w-5 text-zinc-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Premium Project Select */}
                    <div ref={projectSelectRef} className="relative">
                        <label className="text-sm font-semibold text-zinc-300 mb-2 block">
                            <Briefcase className="h-4 w-4 inline mr-2" />
                            Select Project <span className="text-lime">*</span>
                        </label>

                        {loadingProjects ? (
                            <div className="flex items-center gap-2 text-zinc-500 py-3">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading projects...
                            </div>
                        ) : (
                            <>
                                {/* Trigger Button */}
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

                                {/* Dropdown Menu */}
                                <AnimatePresence>
                                    {isProjectSelectOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                            transition={{ duration: 0.15, ease: 'easeOut' }}
                                            className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-white/10 bg-[#121214] shadow-2xl ring-1 ring-black/20 overflow-hidden flex flex-col max-h-[300px]"
                                        >
                                            <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                                                {projectsList.length === 0 ? (
                                                    <div className="py-4 text-center text-zinc-500 text-sm">No projects available</div>
                                                ) : (
                                                    projectsList.map((p: any) => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedProjectId(p.id);
                                                                setSelectedTaskId('');
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
                                                            <span className="truncate font-medium">{p.title}{p.clientName ? ` (${p.clientName})` : ''}</span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </>
                        )}
                    </div>

                    {/* Premium Task Select with Subtasks Support */}
                    <div ref={taskSelectRef} className="relative">
                        <label className="text-sm font-semibold text-zinc-300 mb-2 block">
                            <FileText className="h-4 w-4 inline mr-2" />
                            Select Task <span className="text-lime">*</span>
                        </label>

                        {/* Trigger Button */}
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

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                            {isTaskSelectOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                    className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-white/10 bg-[#121214] shadow-2xl ring-1 ring-black/20 overflow-hidden flex flex-col max-h-[300px]"
                                >
                                    {/* Scrollable List */}
                                    <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                                        {structuredTasks.length === 0 ? (
                                            <div className="py-8 text-center">
                                                <div className="text-zinc-600 text-sm mb-1">No tasks found</div>
                                                <div className="text-zinc-700 text-xs">Select a project first</div>
                                            </div>
                                        ) : (
                                            structuredTasks.map((parent: any) => (
                                                <div key={parent.id}>
                                                    {/* Parent Task */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedTaskId(parent.id);
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
                                                            <span className="truncate font-medium">{parent.title || parent.name}</span>
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
                                                                        setSelectedTaskId(subtask.id);
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
                                                                        <span className="truncate">{subtask.title || subtask.name}</span>
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

                    {/* Hours Worked */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                            <Clock className="h-4 w-4 inline mr-2" />
                            Hours Worked Today *
                        </label>
                        <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            max="24"
                            value={hoursWorked}
                            onChange={(e) => setHoursWorked(e.target.value)}
                            placeholder="e.g., 4.5"
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime transition-colors"
                            required
                        />
                    </div>

                    {/* Deadline */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                            <Calendar className="h-4 w-4 inline mr-2" />
                            Deadline
                        </label>
                        <input
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime transition-colors"
                        />
                    </div>

                    {/* Billing Type */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                            Billing Type *
                        </label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setBillingType('BILLABLE')}
                                className={`flex-1 py-3 rounded-xl border transition-all ${billingType === 'BILLABLE'
                                    ? 'bg-lime/20 border-lime text-lime'
                                    : 'bg-zinc-900 border-white/10 text-zinc-400 hover:border-white/20'
                                    }`}
                            >
                                Billable
                            </button>
                            <button
                                type="button"
                                onClick={() => setBillingType('NON_BILLABLE')}
                                className={`flex-1 py-3 rounded-xl border transition-all ${billingType === 'NON_BILLABLE'
                                    ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                    : 'bg-zinc-900 border-white/10 text-zinc-400 hover:border-white/20'
                                    }`}
                            >
                                Non-Billable
                            </button>
                        </div>
                    </div>

                    {/* Project Type */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                            Project Type *
                        </label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setProjectType('CLIENT')}
                                className={`flex-1 py-3 rounded-xl border transition-all ${projectType === 'CLIENT'
                                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                    : 'bg-zinc-900 border-white/10 text-zinc-400 hover:border-white/20'
                                    }`}
                            >
                                Client
                            </button>
                            <button
                                type="button"
                                onClick={() => setProjectType('IN_HOUSE')}
                                className={`flex-1 py-3 rounded-xl border transition-all ${projectType === 'IN_HOUSE'
                                    ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                    : 'bg-zinc-900 border-white/10 text-zinc-400 hover:border-white/20'
                                    }`}
                            >
                                In-House
                            </button>
                        </div>
                    </div>

                    {/* Notes (optional) */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                            Notes (optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any additional notes..."
                            rows={2}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime transition-colors resize-none"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full bg-lime text-black font-semibold py-3 rounded-xl hover:bg-lime/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                {editingUpdate ? 'Updating...' : 'Submitting...'}
                            </>
                        ) : (
                            editingUpdate ? 'Update Daily Update' : 'Submit Daily Update'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
