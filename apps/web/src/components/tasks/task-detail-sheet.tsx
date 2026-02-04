'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Clock, ListTodo, Loader2, Edit2, Calendar, Tag, Briefcase, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { tasksApi, Task, TaskStatus, TaskPriority } from '@/lib/api/tasks';
import { timeLogsApi } from '@/lib/api/timelogs';
import { useAuthStore } from '@/lib/stores/auth-store';
import CreateTaskSheet from './create-task-sheet';

interface TaskDetailSheetProps {
    isOpen: boolean;
    onClose: () => void;
    taskId: string | null;
    onEdit?: (task: Task) => void;
}

const statusColors: Record<TaskStatus, string> = {
    'TO_DO': 'bg-zinc-600',
    'IN_PROGRESS': 'bg-blue-500',
    'IN_REVIEW': 'bg-purple-500',
    'ON_HOLD': 'bg-amber-500',
    'COMPLETED': 'bg-lime',
    'CLOSED': 'bg-zinc-400',
};

const statusLabels: Record<TaskStatus, string> = {
    'TO_DO': 'To Do',
    'IN_PROGRESS': 'In Progress',
    'IN_REVIEW': 'In Review',
    'ON_HOLD': 'On Hold',
    'COMPLETED': 'Completed',
    'CLOSED': 'Closed',
};

const priorityColors: Record<TaskPriority, string> = {
    'LOW': 'text-zinc-400',
    'MEDIUM': 'text-blue-400',
    'HIGH': 'text-amber-400',
    'URGENT': 'text-red-400',
};

export default function TaskDetailSheet({ isOpen, onClose, taskId, onEdit }: TaskDetailSheetProps) {
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<'subtasks' | 'loghours'>('subtasks');
    const [isSubtaskSheetOpen, setIsSubtaskSheetOpen] = useState(false);
    const [editingField, setEditingField] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const isEmployee = user?.role === 'EMPLOYEE';

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (isOpen) setActiveTab('subtasks');
    }, [isOpen, taskId]);

    const { data: task, isLoading } = useQuery({
        queryKey: ['task', taskId],
        queryFn: () => tasksApi.getOne(taskId!),
        enabled: !!taskId && isOpen,
    });

    useEffect(() => {
        if (task?.parentTask || task?.parentTaskId) {
            setActiveTab('loghours');
        }
    }, [task]);

    const deleteTaskMutation = useMutation({
        mutationFn: (id: string) => tasksApi.delete(id),
        onSuccess: () => {
            toast.success('Task deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            if (task?.parentTaskId) {
                queryClient.invalidateQueries({ queryKey: ['task', task.parentTaskId] });
            }
            onClose();
        },
        onError: () => {
            toast.error('Failed to delete task');
        }
    });

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this task? This cannot be undone.')) {
            deleteTaskMutation.mutate(taskId!);
        }
    };

    const formatHHMM = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}:${m.toString().padStart(2, '0')}`;
    };

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Full Width Modal Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-10 z-50 bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {isLoading ? (
                            <div className="flex-1 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-lime" />
                            </div>
                        ) : task ? (
                            <div className="flex flex-col h-full">
                                {/* Header */}
                                <header className="bg-zinc-950/50 border-b border-white/5 p-6 flex items-start justify-between min-h-[80px]">
                                    <div className="flex-1 pr-8">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                                                <Briefcase className="h-3 w-3" />
                                                <span>{task.project?.title || 'No Project'}</span>
                                            </div>
                                            {task.parentTask && (
                                                <>
                                                    <span className="text-zinc-700">/</span>
                                                    <span className="text-xs text-zinc-400">
                                                        {task.parentTask.name}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">
                                            {task.name}
                                        </h2>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {onEdit && !isEmployee && (
                                            <>
                                                <button
                                                    onClick={() => onEdit(task)}
                                                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={handleDelete}
                                                    disabled={deleteTaskMutation.isPending}
                                                    className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 transition-colors flex items-center gap-2 text-sm font-medium"
                                                >
                                                    {deleteTaskMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={onClose}
                                            className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                                        >
                                            <X className="h-6 w-6" />
                                        </button>
                                    </div>
                                </header>

                                {/* Main Content Grid */}
                                <div className="flex-1 flex overflow-hidden">
                                    {/* Left Column: Description & Work */}
                                    <main className="flex-1 overflow-y-auto p-8 border-r border-white/5">
                                        {/* Description */}
                                        <section className="mb-10">
                                            <h3 className="text-sm font-medium text-zinc-500 mb-4 uppercase tracking-wider">Description</h3>
                                            {task.description ? (
                                                <div
                                                    className="prose prose-invert prose-zinc max-w-none text-zinc-300 leading-relaxed"
                                                    dangerouslySetInnerHTML={{ __html: task.description }}
                                                />
                                            ) : (
                                                <p className="text-zinc-600 italic">No description provided.</p>
                                            )}
                                        </section>

                                        {/* Tabs & Content */}
                                        <section>
                                            <div className="flex items-center gap-6 border-b border-white/10 mb-6">
                                                {!task.parentTask && (
                                                    <button
                                                        onClick={() => setActiveTab('subtasks')}
                                                        className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'subtasks' ? 'text-lime' : 'text-zinc-400 hover:text-zinc-200'}`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <ListTodo className="h-4 w-4" />
                                                            Subtasks
                                                            {task._count?.subtasks ? (
                                                                <span className="ml-1 px-1.5 py-0.5 bg-zinc-800 text-xs rounded-md text-zinc-300">
                                                                    {task._count.subtasks}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        {activeTab === 'subtasks' && (
                                                            <motion.div layoutId="line" className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime" />
                                                        )}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setActiveTab('loghours')}
                                                    className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'loghours' ? 'text-lime' : 'text-zinc-400 hover:text-zinc-200'}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-4 w-4" />
                                                        Log Hours
                                                        {task.totalHours ? (
                                                            <span className="ml-1 px-1.5 py-0.5 bg-zinc-800 text-xs rounded-md text-zinc-300 font-mono">
                                                                ({formatHHMM(task.totalMinutes || 0)})
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    {activeTab === 'loghours' && (
                                                        <motion.div layoutId="line" className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime" />
                                                    )}
                                                </button>
                                            </div>

                                            {activeTab === 'subtasks' && (
                                                <SubtasksTab
                                                    task={task}
                                                    onAddSubtask={() => setIsSubtaskSheetOpen(true)}
                                                    isEmployee={isEmployee}
                                                />
                                            )}
                                            {activeTab === 'loghours' && (
                                                <LogHoursTab task={task} />
                                            )}
                                        </section>
                                    </main>

                                    {/* Right Column: Properties Sidebar */}
                                    <aside className="w-[360px] bg-zinc-950/30 overflow-y-auto p-8 border-l border-white/5">
                                        <div className="space-y-8">
                                            {/* Status & Priority Block */}
                                            <div className="space-y-6">
                                                <div>
                                                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Status</label>
                                                    <div className="inline-flex items-center px-3 py-1.5 rounded-lg border border-white/10 bg-white/5">
                                                        <span className={`h-2 w-2 rounded-full ${statusColors[task.status as TaskStatus]} mr-2`} />
                                                        <span className="text-sm font-medium text-white">{statusLabels[task.status as TaskStatus]}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Priority</label>
                                                    <div className={`inline-flex items-center px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 ${priorityColors[task.priority as TaskPriority]}`}>
                                                        <Tag className="h-3.5 w-3.5 mr-2" />
                                                        <span className="text-sm font-medium">{task.priority}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="h-px bg-white/5" />

                                            {/* Assignees */}
                                            <div>
                                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 block">Assignees</label>
                                                {(task.assignees || []).length > 0 ? (
                                                    <div className="space-y-2">
                                                        {(task.assignees || []).map((a: any, i: number) => (
                                                            <div key={a.id || i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                                                                <div className="h-8 w-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-xs text-white font-medium">
                                                                    {a.firstName?.[0]}{a.lastName?.[0]}
                                                                </div>
                                                                <div className="leading-tight">
                                                                    <p className="text-sm text-zince-200 text-white">{a.firstName} {a.lastName}</p>
                                                                    <p className="text-xs text-zinc-500">{a.designation?.name || 'Member'}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-zinc-600">No assignees</p>
                                                )}
                                            </div>

                                            <div className="h-px bg-white/5" />

                                            {/* Dates */}
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Start Date</label>
                                                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                                                        <Calendar className="h-4 w-4 text-zinc-500" />
                                                        {task.startDate ? format(new Date(task.startDate), 'MMM dd, yyyy') : '—'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Due Date</label>
                                                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                                                        <Calendar className="h-4 w-4 text-zinc-500" />
                                                        {task.dueDate ? format(new Date(task.dueDate), 'MMM dd, yyyy') : '—'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="h-px bg-white/5" />

                                            {/* Billing */}
                                            <div>
                                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Billing</label>
                                                <span className={`text-sm font-medium ${task.billingType === 'BILLABLE' ? 'text-lime' : 'text-zinc-400'}`}>
                                                    {task.billingType?.replace('_', ' ') || 'NON BILLABLE'}
                                                </span>
                                            </div>
                                        </div>
                                    </aside>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-zinc-500">
                                Task not found
                            </div>
                        )}
                    </motion.div>
                </div>
            )}

            {/* Subtask Creation Sheet */}
            {task && (
                <CreateTaskSheet
                    isOpen={isSubtaskSheetOpen}
                    onClose={() => {
                        setIsSubtaskSheetOpen(false);
                        queryClient.invalidateQueries({ queryKey: ['task', taskId] });
                    }}
                    taskToEdit={null}
                    parentTask={task}
                />
            )}
        </AnimatePresence>,
        document.body
    );
}

// Subtasks Tab Component
function SubtasksTab({ task, onAddSubtask, isEmployee }: { task: Task; onAddSubtask: () => void; isEmployee: boolean }) {
    const subtasks = task.subtasks || [];
    const queryClient = useQueryClient();

    const deleteSubtaskMutation = useMutation({
        mutationFn: (id: string) => tasksApi.delete(id),
        onSuccess: () => {
            toast.success('Subtask deleted');
            queryClient.invalidateQueries({ queryKey: ['task', task.id] });
        },
        onError: () => toast.error('Failed to delete subtask')
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-medium text-white">
                    Subtasks List
                </h4>
                {!isEmployee && (
                    <button
                        onClick={onAddSubtask}
                        className="px-3 py-1.5 bg-lime/10 text-lime text-xs font-bold rounded-lg hover:bg-lime/20 transition-colors flex items-center gap-2 border border-lime/20"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        New Subtask
                    </button>
                )}
            </div>

            {subtasks.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                    <ListTodo className="h-10 w-10 mx-auto mb-3 text-zinc-600" />
                    <p className="text-zinc-500 text-sm">No subtasks yet</p>
                    <p className="text-zinc-600 text-xs mt-1">Break this task into smaller steps</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {subtasks.map((subtask: any, i: number) => (
                        <div
                            key={subtask.id || i}
                            className="group flex items-center justify-between gap-4 p-4 bg-zinc-900/40 border border-white/5 rounded-xl hover:border-white/10 transition-colors hover:bg-zinc-900/60"
                        >
                            <div className="flex items-center gap-4 flex-1">
                                <div className={`h-2 w-2 rounded-full ${statusColors[subtask.status as TaskStatus]} shrink-0`} />
                                <div className="min-w-0">
                                    <p className="text-white font-medium text-sm truncate">{subtask.name}</p>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className={`text-[10px] uppercase font-bold tracking-wider ${priorityColors[subtask.priority as TaskPriority]}`}>
                                            {subtask.priority}
                                        </span>
                                        {subtask._count?.timeLogs ? (
                                            <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {subtask._count.timeLogs} logs
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {subtask.assignees && subtask.assignees.length > 0 && (
                                    <div className="flex -space-x-2">
                                        {subtask.assignees.slice(0, 3).map((a: any, j: number) => (
                                            <div
                                                key={a.id || j}
                                                className="h-6 w-6 rounded-full bg-zinc-800 border-2 border-zinc-950 flex items-center justify-center text-[10px] text-white"
                                                title={`${a.firstName} ${a.lastName}`}
                                            >
                                                {a.firstName?.[0]}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {!isEmployee && (
                                    <button
                                        onClick={() => {
                                            if (confirm('Delete this subtask?')) {
                                                deleteSubtaskMutation.mutate(subtask.id);
                                            }
                                        }}
                                        disabled={deleteSubtaskMutation.isPending}
                                        className="text-zinc-600 hover:text-red-500 p-1.5 hover:bg-red-500/10 rounded transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Log Hours Tab Component
function LogHoursTab({ task }: { task: Task }) {
    // 1. Aggregate all logs (Main Task + Subtasks)
    const allLogs = [
        ...(task.timeLogs || []).map((log: any) => ({ ...log, taskName: task.name, isSubtask: false })),
        ...(task.subtasks || []).flatMap((subtask: any) =>
            (subtask.timeLogs || []).map((log: any) => ({
                ...log,
                taskName: subtask.name,
                isSubtask: true
            }))
        )
    ];

    // 2. Sort by Date Descending
    allLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 3. Group by Date
    const groupedLogs: Record<string, typeof allLogs> = {};
    allLogs.forEach(log => {
        const dateKey = format(new Date(log.date), 'yyyy-MM-dd');
        if (!groupedLogs[dateKey]) {
            groupedLogs[dateKey] = [];
        }
        groupedLogs[dateKey].push(log);
    });

    const formatHHMM = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-medium text-white">
                    Logged Hours
                </h4>
                <button
                    onClick={() => {
                        window.location.href = `/dashboard/time-logs?taskId=${task.id}`;
                    }}
                    className="px-3 py-1.5 bg-lime/10 text-lime text-xs font-bold rounded-lg hover:bg-lime/20 transition-colors flex items-center gap-2 border border-lime/20"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Log Time
                </button>
            </div>

            {Object.keys(groupedLogs).length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                    <Clock className="h-10 w-10 mx-auto mb-3 text-zinc-600" />
                    <p className="text-zinc-500 text-sm">No time logged yet</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedLogs).map(([dateKey, logs]) => {
                        const dateObj = new Date(dateKey);
                        const totalMinutes = logs.reduce((sum, log) => sum + log.durationMinutes, 0);
                        const billableMinutes = logs.filter(l => l.billingType === 'BILLABLE').reduce((sum, l) => sum + l.durationMinutes, 0);
                        const nonBillableMinutes = totalMinutes - billableMinutes;

                        return (
                            <div key={dateKey} className="rounded-xl overflow-hidden border border-white/5 bg-[#0a0a0a]">
                                {/* Date Header */}
                                <div className="bg-zinc-900/50 p-4 flex items-center justify-between border-b border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-lime/10 flex items-center justify-center text-lime">
                                            <Clock className="h-4 w-4" />
                                        </div>
                                        <span className="text-white font-medium text-sm">
                                            {format(dateObj, 'EEEE, d MMMM yyyy')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-6 text-xs font-mono">
                                        <div className="text-zinc-400">
                                            Total: <span className="text-white font-bold">{formatHHMM(totalMinutes)}</span>
                                        </div>
                                        <div className="text-lime/80">
                                            B: <span className="font-bold">{formatHHMM(billableMinutes)}</span>
                                        </div>
                                        <div className="text-zinc-500">
                                            NB: <span className="font-bold">{formatHHMM(nonBillableMinutes)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Logs Rows */}
                                <div className="divide-y divide-white/5">
                                    {logs.map((log: any, index) => (
                                        <div key={log.id || index} className="p-4 hover:bg-white/[0.02] transition-colors flex items-center justify-between group">
                                            <div className="flex-1 min-w-0 pr-8">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-white font-medium text-sm truncate">
                                                        {log.taskName}
                                                    </span>
                                                    {log.isSubtask && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                                                            Subtask
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${task.project ? 'bg-blue-400' : 'bg-zinc-600'}`} />
                                                    <span>{task.project?.title || 'No Project'}</span>
                                                    {log.description && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="truncate max-w-[300px] text-zinc-400">
                                                                {log.description.replace(/<[^>]*>?/gm, '')}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Columns */}
                                            <div className="flex items-center gap-8">
                                                {/* Duration */}
                                                <div className="w-16 text-right">
                                                    <span className="text-white font-mono font-bold text-sm">
                                                        {formatHHMM(log.durationMinutes)}
                                                    </span>
                                                </div>

                                                {/* User */}
                                                <div className="flex items-center gap-2 w-32">
                                                    <div className="h-6 w-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-white shrink-0">
                                                        {log.employee?.firstName?.[0] || '?'}
                                                    </div>
                                                    <span className="text-zinc-400 text-xs truncate">
                                                        {log.employee?.firstName} {log.employee?.lastName}
                                                    </span>
                                                </div>

                                                {/* Billing Badge */}
                                                <div className="w-24 flex justify-center">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${log.billingType === 'BILLABLE'
                                                        ? 'bg-lime/10 text-lime border border-lime/20'
                                                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                                                        }`}>
                                                        {log.billingType === 'BILLABLE' ? 'Billable' : 'Non-Bill'}
                                                    </span>
                                                </div>

                                                {/* Status Badge */}
                                                <div className="w-24 flex justify-center">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${log.status === 'APPROVED'
                                                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                        : log.status === 'REJECTED'
                                                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                                        }`}>
                                                        <div className={`w-1 h-1 rounded-full ${log.status === 'APPROVED' ? 'bg-blue-400' :
                                                            log.status === 'REJECTED' ? 'bg-red-400' : 'bg-zinc-400'
                                                            }`} />
                                                        {log.status || 'PENDING'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
