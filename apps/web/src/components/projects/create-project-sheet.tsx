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
import { projectsApi } from '@/lib/api/projects';
import { employeesApi } from '@/lib/api/employees';
import { motion, AnimatePresence } from 'framer-motion';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

const projectSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    clientName: z.string().optional(),
    description: z.string().optional(),
    ownerId: z.string().min(1, 'Please select a project owner'),
});

type ProjectForm = z.infer<typeof projectSchema>;

interface CreateProjectSheetProps {
    isOpen: boolean;
    onClose: () => void;
    projectToEdit?: any; // Project object
}

export default function CreateProjectSheet({ isOpen, onClose, projectToEdit }: CreateProjectSheetProps) {
    const [mounted, setMounted] = useState(false);
    const queryClient = useQueryClient();

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const { data: employeesResponse, isLoading: isLoadingEmployees } = useQuery({
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
        formState: { errors },
    } = useForm<ProjectForm>({
        resolver: zodResolver(projectSchema),
    });

    // Reset form when opening or changing projectToEdit
    useEffect(() => {
        if (isOpen) {
            if (projectToEdit) {
                reset({
                    title: projectToEdit.title,
                    clientName: projectToEdit.clientName || '',
                    description: projectToEdit.description || '',
                    ownerId: projectToEdit.owner?.id || projectToEdit.ownerId || '',
                });
            } else {
                reset({
                    title: '',
                    clientName: '',
                    description: '',
                    ownerId: '',
                });
            }
        }
    }, [isOpen, projectToEdit, reset]);

    const mutation = useMutation({
        mutationFn: (data: ProjectForm) => {
            if (projectToEdit) {
                return projectsApi.update(projectToEdit.id, data);
            }
            return projectsApi.create(data);
        },
        onSuccess: () => {
            toast.success(projectToEdit ? 'Project updated successfully' : 'Project created successfully');
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            onClose();
            if (!projectToEdit) reset();
        },
        onError: (error: any) => {
            console.error(error);
            toast.error(error?.response?.data?.message || 'Operation failed');
        },
    });

    const onSubmit = (data: ProjectForm) => {
        mutation.mutate(data);
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
                                <h2 className="text-2xl font-bold text-white tracking-tight">
                                    {projectToEdit ? 'Edit Project' : 'New Project'}
                                </h2>
                                <p className="text-zinc-400 text-sm mt-1">
                                    {projectToEdit ? 'Update project details' : 'Create a new project and assign owner'}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form className="p-6 space-y-8 flex-1 overflow-y-auto">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Project Title <span className="text-lime">*</span></label>
                                    <input
                                        type="text"
                                        {...register('title')}
                                        placeholder="e.g. Website Redesign"
                                        className="w-full px-4 py-3.5 rounded-xl border border-white/10 bg-zinc-900/50 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all placeholder:text-zinc-600 font-medium"
                                    />
                                    {errors.title && (
                                        <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Project Owner <span className="text-lime">*</span></label>
                                    {isLoadingEmployees ? (
                                        <div className="h-12 w-full bg-zinc-900/50 animate-pulse rounded-xl" />
                                    ) : (
                                        <div className="relative">
                                            <select
                                                {...register('ownerId')}
                                                className="w-full px-4 py-3.5 rounded-xl border border-white/10 bg-zinc-900/50 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all appearance-none font-medium cursor-pointer"
                                            >
                                                <option value="">Select an employee</option>
                                                {employees.map((emp: any) => (
                                                    <option key={emp.id} value={emp.id}>
                                                        {emp.firstName} {emp.lastName} ({emp.designation?.name || 'N/A'})
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                    {errors.ownerId && (
                                        <p className="text-red-500 text-sm mt-1">{errors.ownerId.message}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Client Name</label>
                                    <input
                                        type="text"
                                        {...register('clientName')}
                                        placeholder="e.g. Acme Corp"
                                        className="w-full px-4 py-3.5 rounded-xl border border-white/10 bg-zinc-900/50 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all placeholder:text-zinc-600 font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-zinc-300 mb-2 block">Description</label>
                                    <div className="h-64 mb-14">
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
                                                        modules={{
                                                            toolbar: [
                                                                [{ 'header': [1, 2, false] }],
                                                                ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                                                                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                                ['link'],
                                                                ['clean']
                                                            ],
                                                        }}
                                                    />
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>

                        <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-[#0a0a0a]">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-medium text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit(onSubmit)}
                                disabled={mutation.isPending}
                                className="px-8 py-3 bg-lime text-black rounded-xl font-bold hover:bg-lime/90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_25px_rgba(204,255,0,0.2)] hover:shadow-[0_0_35px_rgba(204,255,0,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {mutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {projectToEdit ? 'Updating...' : 'Creating...'}
                                    </>
                                ) : (
                                    projectToEdit ? 'Update Project' : 'Create Project'
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
