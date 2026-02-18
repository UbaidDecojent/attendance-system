'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, TaskStatus } from '@/lib/api/tasks';
import { projectsApi } from '@/lib/api/projects';
import { employeesApi } from '@/lib/api/employees';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Plus, LayoutList, Kanban, Filter } from 'lucide-react';
import TaskList from '@/components/tasks/task-list';
import TaskKanban from '@/components/tasks/task-kanban';
import CreateTaskSheet from '@/components/tasks/create-task-sheet';
import TaskDetailSheet from '@/components/tasks/task-detail-sheet';
import { toast } from 'sonner';

export default function TasksPage() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [view, setView] = useState<'list' | 'kanban'>('list');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [taskToEdit, setTaskToEdit] = useState<any>(null); // For editing
    const [showFilters, setShowFilters] = useState(false);

    const [filters, setFilters] = useState({
        projectId: '',
        status: '',
        priority: '',
        billingType: '',
        assigneeId: '',
        startDate: '',
        dueDate: ''
    });

    const canCreate = user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN' || user?.role === 'HR_MANAGER' || user?.role === 'TEAM_MANAGER';

    // Fetch Options for Filters
    const { data: projectsResponse } = useQuery({
        queryKey: ['projects'],
        queryFn: () => projectsApi.getAll()
    });
    const projects = Array.isArray(projectsResponse) ? projectsResponse : (projectsResponse as any)?.data || [];

    const { data: employeesResponse } = useQuery({
        queryKey: ['employees-list'],
        queryFn: () => employeesApi.getAll({})
    });
    const employees = Array.isArray(employeesResponse)
        ? employeesResponse
        : (employeesResponse as any)?.data || (employeesResponse as any)?.items || [];

    // Fetch Tasks with Filters
    const { data: tasksResponse, isLoading } = useQuery({
        queryKey: ['tasks', filters, view],
        queryFn: () => tasksApi.getAll({ ...filters, includeSubtasks: view === 'kanban' })
    });

    const tasks = Array.isArray(tasksResponse) ? tasksResponse : (tasksResponse as any)?.data || [];

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
            tasksApi.update(id, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Task status updated');
        },
        onError: () => {
            toast.error('Failed to update status');
        }
    });

    const handleStatusChange = (id: string, newStatus: TaskStatus) => {
        updateStatusMutation.mutate({ id, status: newStatus });
    };

    const handleViewDetails = (taskId: string) => {
        setSelectedTaskId(taskId);
    };

    const handleKanbanEdit = (task: any) => {
        setTaskToEdit(task);
        setIsCreateOpen(true);
    };

    const handleEditTask = (task: any) => {
        setTaskToEdit(task);
        setIsCreateOpen(true);
    };

    const handleCreateOpen = () => {
        setTaskToEdit(null);
        setIsCreateOpen(true);
    };

    const clearFilters = () => {
        setFilters({
            projectId: '',
            status: '',
            priority: '',
            billingType: '',
            assigneeId: '',
            startDate: '',
            dueDate: ''
        });
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Tasks</h1>
                        <p className="text-zinc-400">Manage and track project tasks</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 font-medium ${showFilters ? 'bg-lime text-black border-lime' : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'}`}
                        >
                            <Filter className="h-4 w-4" />
                            <span className="hidden sm:inline">Filters</span>
                        </button>

                        <div className="bg-zinc-900 border border-white/10 rounded-lg p-1 flex">
                            <button
                                onClick={() => setView('list')}
                                className={`p-2 rounded-md transition-all ${view === 'list' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                            >
                                <LayoutList className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setView('kanban')}
                                className={`p-2 rounded-md transition-all ${view === 'kanban' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                            >
                                <Kanban className="h-4 w-4" />
                            </button>
                        </div>

                        {canCreate && (
                            <button
                                onClick={handleCreateOpen}
                                className="flex items-center gap-2 px-4 py-2.5 bg-lime text-black rounded-xl font-bold hover:bg-lime/90 transition-all shadow-[0_0_20px_rgba(204,255,0,0.2)] hover:shadow-[0_0_30px_rgba(204,255,0,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Plus className="h-5 w-5" />
                                <span className="hidden sm:inline">Add Task</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter Bar */}
                {showFilters && (
                    <div className="bg-zinc-900/50 border border-white/10 p-4 rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 animate-in slide-in-from-top-2">
                        <select
                            value={filters.projectId}
                            onChange={(e) => handleFilterChange('projectId', e.target.value)}
                            className="bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-lime outline-none"
                        >
                            <option value="">All Projects</option>
                            {projects.map((p: any) => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                        </select>

                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-lime outline-none"
                        >
                            <option value="">All Status</option>
                            <option value="TO_DO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="IN_REVIEW">In Review</option>
                            <option value="ON_HOLD">On Hold</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CLOSED">Closed</option>
                        </select>

                        <select
                            value={filters.priority}
                            onChange={(e) => handleFilterChange('priority', e.target.value)}
                            className="bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-lime outline-none"
                        >
                            <option value="">All Priorities</option>
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                        </select>

                        <select
                            value={filters.billingType}
                            onChange={(e) => handleFilterChange('billingType', e.target.value)}
                            className="bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-lime outline-none"
                        >
                            <option value="">All Billing</option>
                            <option value="BILLABLE">Billable</option>
                            <option value="NON_BILLABLE">Non-Billable</option>
                        </select>

                        <select
                            value={filters.assigneeId}
                            onChange={(e) => handleFilterChange('assigneeId', e.target.value)}
                            className="bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-lime outline-none"
                        >
                            <option value="">All Assignees</option>
                            {employees.map((emp: any) => (
                                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                            ))}
                        </select>

                        <input
                            type="date"
                            placeholder="Start Date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            className="bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-lime outline-none text-zinc-400"
                        />
                        <input
                            type="date"
                            placeholder="Due Date"
                            value={filters.dueDate}
                            onChange={(e) => handleFilterChange('dueDate', e.target.value)}
                            className="bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-lime outline-none text-zinc-400"
                        />
                    </div>
                )}
            </div>

            <div className="flex-1 min-h-0 bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                <div className="flex-1 overflow-auto bg-zinc-950/30 p-4">
                    {view === 'list' ? (
                        <TaskList tasks={tasks} isLoading={isLoading} onViewDetails={handleViewDetails} />
                    ) : (
                        <div className="h-full">
                            <TaskKanban
                                tasks={tasks}
                                isLoading={isLoading}
                                onStatusChange={handleStatusChange}
                                onEdit={handleKanbanEdit}
                                onViewDetails={handleViewDetails}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Create Task Sheet */}
            <CreateTaskSheet
                isOpen={isCreateOpen}
                onClose={() => {
                    setIsCreateOpen(false);
                    setTaskToEdit(null);
                }}
                taskToEdit={taskToEdit}
            />

            {/* Task Detail Sheet */}
            <TaskDetailSheet
                isOpen={!!selectedTaskId}
                onClose={() => setSelectedTaskId(null)}
                taskId={selectedTaskId}
                onEdit={handleEditTask}
            />
        </div>
    );
}
