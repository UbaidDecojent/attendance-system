import { format } from 'date-fns';
import { Task } from '@/lib/api/tasks';
import { ListTodo, Clock } from 'lucide-react';

interface TaskListProps {
    tasks: Task[];
    isLoading: boolean;
    onViewDetails?: (taskId: string) => void;
}

export default function TaskList({ tasks, isLoading, onViewDetails }: TaskListProps) {
    if (isLoading) {
        return <div className="p-8 text-center text-zinc-500">Loading tasks...</div>;
    }

    if (tasks.length === 0) {
        return <div className="p-8 text-center text-zinc-500">No tasks found.</div>;
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'TO_DO': return 'bg-zinc-800 text-zinc-300';
            case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'IN_REVIEW': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'ON_HOLD': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
            case 'COMPLETED': return 'bg-lime/10 text-lime border-lime/20';
            case 'CLOSED': return 'bg-zinc-800 text-zinc-500';
            default: return 'bg-zinc-800 text-white';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'LOW': return 'text-zinc-400';
            case 'MEDIUM': return 'text-blue-400';
            case 'HIGH': return 'text-orange-400';
            case 'URGENT': return 'text-red-400 font-bold';
            default: return 'text-zinc-400';
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-white/10 text-xs text-zinc-400 uppercase tracking-wider">
                        <th className="px-6 py-4 font-medium">Task Name</th>
                        <th className="px-6 py-4 font-medium">Project</th>
                        <th className="px-6 py-4 font-medium">Status</th>
                        <th className="px-6 py-4 font-medium">Priority</th>
                        <th className="px-6 py-4 font-medium text-center">Subtasks</th>
                        <th className="px-6 py-4 font-medium">Due Date</th>
                        <th className="px-6 py-4 font-medium">Assignees</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                    {tasks.map((task) => (
                        <tr
                            key={task.id}
                            className="group hover:bg-white/5 transition-colors cursor-pointer"
                            onClick={() => onViewDetails?.(task.id)}
                        >
                            <td className="px-6 py-4">
                                <span className="font-medium text-white">{task.name}</span>
                            </td>
                            <td className="px-6 py-4 text-zinc-300">{task.project?.title || 'Unknown'}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                                    {task.status.replace('_', ' ')}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                                {task._count?.subtasks ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded-lg text-xs text-zinc-300">
                                        <ListTodo className="h-3 w-3" />
                                        {task._count.subtasks}
                                    </span>
                                ) : (
                                    <span className="text-zinc-600">—</span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-zinc-400">
                                {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '-'}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex -space-x-2">
                                    {(task.assignees || []).slice(0, 3).map((assignee, i) => (
                                        <div
                                            key={assignee.id}
                                            className="h-8 w-8 rounded-full border-2 border-[#0a0a0a] bg-zinc-800 flex items-center justify-center text-xs text-white"
                                            title={`${assignee.firstName} ${assignee.lastName}`}
                                        >
                                            {assignee.avatar ? (
                                                <img src={assignee.avatar} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                                            ) : (
                                                <span>{assignee.firstName[0]}{assignee.lastName[0]}</span>
                                            )}
                                        </div>
                                    ))}
                                    {(task.assignees || []).length > 3 && (
                                        <div className="h-8 w-8 rounded-full border-2 border-[#0a0a0a] bg-zinc-800 flex items-center justify-center text-xs text-zinc-400">
                                            +{task.assignees.length - 3}
                                        </div>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

