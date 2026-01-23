'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Plus, MoreHorizontal, ArrowUpRight, Pencil, Trash2 } from 'lucide-react';
import { projectsApi } from '@/lib/api/projects';
import CreateProjectSheet from '@/components/projects/create-project-sheet';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export default function ProjectsPage() {
    const user = useAuthStore((state) => state.user);
    const isAdmin = ['COMPANY_ADMIN', 'HR_MANAGER'].includes(user?.role || '');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const queryClient = useQueryClient();

    const { data: projectsResponse, isLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: projectsApi.getAll,
    });

    const projects = Array.isArray(projectsResponse) ? projectsResponse : (projectsResponse as any)?.data || [];

    const deleteMutation = useMutation({
        mutationFn: (id: string) => projectsApi.delete(id),
        onSuccess: () => {
            toast.success('Project deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to delete project');
        }
    });

    const handleCreate = () => {
        setSelectedProject(null);
        setIsCreateOpen(true);
    };

    const handleEdit = (project: any) => {
        setSelectedProject(project);
        setIsCreateOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Projects</h1>
                    <p className="text-zinc-500">Manage and track company projects</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={handleCreate}
                        className="bg-lime text-black hover:bg-lime/90 px-5 py-2.5 rounded-xl font-bold shadow-[0_0_20px_rgba(204,255,0,0.2)] inline-flex items-center gap-2 transition-all"
                    >
                        <Plus className="h-5 w-5" />
                        Create Project
                    </button>
                )}
            </div>

            <div className="bg-[#111111] border border-white/5 rounded-[1.5rem] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5 bg-zinc-900/50">
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Project Name</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Client</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Owner</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Created</th>
                                {isAdmin && <th className="px-6 py-4 text-right"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr><td colSpan={isAdmin ? 7 : 6} className="text-center py-12 text-zinc-500 animate-pulse">Loading projects...</td></tr>
                            ) : !projects || projects.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdmin ? 7 : 6} className="text-center py-12">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-12 w-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500">
                                                <ArrowUpRight className="h-6 w-6" />
                                            </div>
                                            <p className="text-zinc-500 font-medium">No projects found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                projects.map((project: any) => (
                                    <tr key={project.id} className="group hover:bg-zinc-900/30 transition-colors">
                                        <td className="px-6 py-4 text-sm text-zinc-500 font-mono">
                                            #{project.id.split('-')[0]}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-white group-hover:text-lime transition-colors">{project.title}</div>
                                            {project.description && (
                                                <div className="text-xs text-zinc-500 mt-0.5 max-w-[200px] truncate">
                                                    {project.description.replace(/<[^>]*>?/gm, '')}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-zinc-400">
                                            {project.clientName || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {project.owner ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                                                        {project.owner.avatar ? (
                                                            <img src={project.owner.avatar} alt="" className="h-full w-full object-cover" />
                                                        ) : (
                                                            <span>{project.owner.firstName[0]}{project.owner.lastName[0]}</span>
                                                        )}
                                                    </div>
                                                    <span className="text-sm text-zinc-300 font-medium">{project.owner.firstName} {project.owner.lastName}</span>
                                                </div>
                                            ) : (
                                                <span className="text-zinc-600 text-sm italic">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                                                project.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                    project.status === 'COMPLETED' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                        "bg-zinc-800 text-zinc-500 border-zinc-700"
                                            )}>
                                                {project.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-zinc-500 tabular-nums">
                                            {format(new Date(project.createdAt), 'MMM d, yyyy')}
                                        </td>
                                        {isAdmin && (
                                            <td className="px-6 py-4 text-right">
                                                <DropdownMenu.Root>
                                                    <DropdownMenu.Trigger asChild>
                                                        <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-white outline-none">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </button>
                                                    </DropdownMenu.Trigger>
                                                    <DropdownMenu.Portal>
                                                        <DropdownMenu.Content
                                                            className="min-w-[160px] bg-[#1a1a1a] rounded-xl border border-white/10 p-1 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200"
                                                            align="end"
                                                            sideOffset={5}
                                                        >
                                                            <DropdownMenu.Item
                                                                onClick={() => handleEdit(project)}
                                                                className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer outline-none transition-colors"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                                Edit Details
                                                            </DropdownMenu.Item>
                                                            <DropdownMenu.Separator className="h-px bg-white/10 my-1" />
                                                            <DropdownMenu.Item
                                                                onClick={() => handleDelete(project.id)}
                                                                className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg cursor-pointer outline-none transition-colors"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                Delete Project
                                                            </DropdownMenu.Item>
                                                        </DropdownMenu.Content>
                                                    </DropdownMenu.Portal>
                                                </DropdownMenu.Root>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CreateProjectSheet
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                projectToEdit={selectedProject}
            />
        </div>
    );
}
