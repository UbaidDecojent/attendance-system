'use client';

import { useState } from 'react';
import { DndContext, DragOverlay, useDraggable, useDroppable, closestCorners } from '@dnd-kit/core';
import { Task, TaskStatus } from '@/lib/api/tasks';
import { format } from 'date-fns';
import { Pencil } from 'lucide-react';

interface TaskKanbanProps {
    tasks: Task[];
    isLoading: boolean;
    onStatusChange: (id: string, newStatus: TaskStatus) => void;
    onEdit?: (task: Task) => void;
}

const COLUMNS: { id: TaskStatus; title: string }[] = [
    { id: 'TO_DO', title: 'To Do' },
    { id: 'IN_PROGRESS', title: 'In Progress' },
    { id: 'IN_REVIEW', title: 'In Review' },
    { id: 'ON_HOLD', title: 'On Hold' },
    { id: 'COMPLETED', title: 'Completed' },
];

export default function TaskKanban({ tasks, isLoading, onStatusChange, onEdit }: TaskKanbanProps) {
    const [activeId, setActiveId] = useState<string | null>(null);

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event: any) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            // Find the task
            const task = tasks.find(t => t.id === active.id);
            if (task) {
                // If dropped over a container (status column)
                if (COLUMNS.find(c => c.id === over.id)) {
                    if (task.status !== over.id) {
                        onStatusChange(task.id, over.id as TaskStatus);
                    }
                }
                // If dropped over another item?
                // For simplicity, we assume dropping on the column container or an item within it maps to that column.
                // But useDroppable usually is on the column.
            }
        }
        setActiveId(null);
    };

    if (isLoading) return <div className="p-8 text-center text-zinc-500">Loading board...</div>;

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
            <div className="flex h-full gap-4 overflow-x-auto pb-4">
                {COLUMNS.map((col) => (
                    <KanbanColumn
                        key={col.id}
                        id={col.id}
                        title={col.title}
                        tasks={tasks.filter(t => t.status === col.id)}
                        onEdit={onEdit}
                    />
                ))}
            </div>

            <DragOverlay>
                {activeId ? (
                    <div className="opacity-80 rotate-2 cursor-grabbing">
                        {/* Simplified Card Overlay */}
                        <div className="bg-zinc-800 p-4 rounded-xl border border-white/10 shadow-xl w-72">
                            Moving...
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

function KanbanColumn({ id, title, tasks, onEdit }: { id: string; title: string; tasks: Task[], onEdit?: (task: Task) => void }) {
    const { setNodeRef } = useDroppable({ id });

    return (
        <div ref={setNodeRef} className="flex-shrink-0 w-80 bg-zinc-900/30 rounded-2xl border border-white/5 flex flex-col h-full max-h-[calc(100vh-200px)]">
            <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-transparent backdrop-blur-sm z-10">
                <h3 className="font-semibold text-zinc-300 text-sm">{title}</h3>
                <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-xs">{tasks.length}</span>
            </div>
            <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                {tasks.map(task => (
                    <KanbanCard key={task.id} task={task} onEdit={onEdit} />
                ))}
                {tasks.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center text-zinc-600 text-xs text-center px-4">
                        Drop items here
                    </div>
                )}
            </div>
        </div>
    );
}

function KanbanCard({ task, onEdit }: { task: Task, onEdit?: (task: Task) => void }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={() => onEdit?.(task)}
            className={`
                bg-zinc-800 hover:bg-zinc-800/80 p-4 rounded-xl border border-white/10 shadow-sm cursor-grab active:cursor-grabbing group transition-all
                ${isDragging ? 'opacity-50' : 'opacity-100'}
            `}
        >
            <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider
                    ${task.priority === 'URGENT' ? 'bg-red-500/10 text-red-500' :
                        task.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}
                `}>
                    {task.priority}
                </span>
                <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(task);
                    }}
                    className="text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded"
                >
                    <Pencil className="h-3.5 w-3.5" />
                </button>
            </div>

            <h4 className="text-sm font-medium text-white mb-2 line-clamp-2">{task.name}</h4>
            <div className="text-xs text-zinc-500 mb-3">{task.project?.title}</div>

            <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1">
                <div className="flex -space-x-1.5">
                    {(task.assignees || []).slice(0, 3).map((assignee) => (
                        <div
                            key={assignee.id}
                            className="h-6 w-6 rounded-full border border-[#18181b] bg-zinc-700 flex items-center justify-center text-[10px] text-white"
                            title={assignee.firstName}
                        >
                            {assignee.avatar ? (
                                <img src={assignee.avatar} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                            ) : (
                                <span>{assignee.firstName[0]}</span>
                            )}
                        </div>
                    ))}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                    {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : ''}
                </div>
            </div>
        </div>
    );
}
