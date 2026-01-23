import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { TimeLogStatus } from '@/lib/api/timelogs';
import { BillingType } from '@/lib/api/tasks';

interface FilterState {
    projectIds: string[];
    userIds: string[];
    status: TimeLogStatus | '';
    billingType: BillingType | '';
    clientNames: string[]; // UPDATED: Array
    // Placeholders
    approvedBy: string;
}

interface TimeLogFilterSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
    initialFilters: FilterState;
    projects: any[];
    employees: any[];
    isAdmin: boolean;
}

export default function TimeLogFilterSidebar({
    isOpen,
    onClose,
    onApply,
    initialFilters,
    projects,
    employees,
    isAdmin
}: TimeLogFilterSidebarProps) {
    const [filters, setFilters] = useState<FilterState>(initialFilters);

    // Sync when opened
    useEffect(() => {
        if (isOpen) {
            setFilters(initialFilters);
        }
    }, [isOpen, initialFilters]);

    // Extract Unique Client Names
    const uniqueClients = Array.from(new Set(
        projects
            .map(p => p.clientName)
            .filter(name => name && name.trim() !== '')
    )).sort();

    const handleClear = () => {
        setFilters({
            projectIds: [],
            userIds: [],
            status: '',
            billingType: '',
            clientNames: [],
            approvedBy: ''
        });
    };

    const handleApply = () => {
        onApply(filters);
        onClose();
    };

    const toggleProject = (id: string) => {
        setFilters(prev => {
            const exists = prev.projectIds.includes(id);
            return {
                ...prev,
                projectIds: exists
                    ? prev.projectIds.filter(pid => pid !== id)
                    : [...prev.projectIds, id]
            };
        });
    };

    const toggleUser = (id: string) => {
        setFilters(prev => {
            const exists = prev.userIds.includes(id);
            return {
                ...prev,
                userIds: exists
                    ? prev.userIds.filter(uid => uid !== id)
                    : [...prev.userIds, id]
            };
        });
    };

    const toggleClient = (name: string) => {
        setFilters(prev => {
            const exists = prev.clientNames.includes(name);
            return {
                ...prev,
                clientNames: exists
                    ? prev.clientNames.filter(n => n !== name)
                    : [...prev.clientNames, name]
            };
        });
    };

    const toggleAllProjects = () => {
        setFilters(prev => ({
            ...prev,
            projectIds: prev.projectIds.length === projects.length ? [] : projects.map(p => p.id)
        }));
    };

    const toggleAllUsers = () => {
        setFilters(prev => ({
            ...prev,
            userIds: prev.userIds.length === employees.length ? [] : employees.map(e => e.id)
        }));
    };

    const toggleAllClients = () => {
        setFilters(prev => ({
            ...prev,
            clientNames: prev.clientNames.length === uniqueClients.length ? [] : [...uniqueClients]
        }));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-[#121212] border-l border-white/10 shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <h2 className="text-xl font-bold text-white">Filter By</h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-400">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                            {/* 1. Projects */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-zinc-400">Project</label>
                                    <button onClick={toggleAllProjects} className="text-xs text-lime hover:underline">
                                        {filters.projectIds.length === projects.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar border border-white/5 rounded-lg p-2 bg-zinc-900/30">
                                    {projects.map(project => (
                                        <div
                                            key={project.id}
                                            onClick={() => toggleProject(project.id)}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group"
                                        >
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${filters.projectIds.includes(project.id) ? 'bg-lime border-lime text-black' : 'border-zinc-600 group-hover:border-zinc-400'}`}>
                                                {filters.projectIds.includes(project.id) && <Check className="h-3.5 w-3.5" />}
                                            </div>
                                            <span className="text-sm text-zinc-200 truncate">{project.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 2. Client Name (Dynamic Multi-select) */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-zinc-400">Client Name</label>
                                    {uniqueClients.length > 0 && (
                                        <button onClick={toggleAllClients} className="text-xs text-lime hover:underline">
                                            {filters.clientNames.length === uniqueClients.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    )}
                                </div>
                                {uniqueClients.length === 0 ? (
                                    <div className="p-3 text-sm text-zinc-500 bg-zinc-900/30 rounded-lg border border-white/5 italic">
                                        No clients found. Add Client Name to projects to see them here.
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar border border-white/5 rounded-lg p-2 bg-zinc-900/30">
                                        {uniqueClients.map(client => (
                                            <div
                                                key={client}
                                                onClick={() => toggleClient(client as string)}
                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group"
                                            >
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${filters.clientNames.includes(client as string) ? 'bg-lime border-lime text-black' : 'border-zinc-600 group-hover:border-zinc-400'}`}>
                                                    {filters.clientNames.includes(client as string) && <Check className="h-3.5 w-3.5" />}
                                                </div>
                                                <span className="text-sm text-zinc-200 truncate">{client}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 3. Status */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-zinc-400">Status</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-lime outline-none"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="REJECTED">Rejected</option>
                                </select>
                            </div>

                            {/* 4. Billing Type */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-zinc-400">Billing Type</label>
                                <select
                                    value={filters.billingType}
                                    onChange={(e) => setFilters(prev => ({ ...prev, billingType: e.target.value as any }))}
                                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-lime outline-none"
                                >
                                    <option value="">All Types</option>
                                    <option value="BILLABLE">Billable</option>
                                    <option value="NON_BILLABLE">Non-Billable</option>
                                </select>
                            </div>

                            {/* 5. Users (Admin Only) */}
                            {isAdmin && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-zinc-400">Users</label>
                                        <button onClick={toggleAllUsers} className="text-xs text-lime hover:underline">
                                            {filters.userIds.length === employees.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar border border-white/5 rounded-lg p-2 bg-zinc-900/30">
                                        {employees.map(emp => (
                                            <div
                                                key={emp.id}
                                                onClick={() => toggleUser(emp.id)}
                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group"
                                            >
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${filters.userIds.includes(emp.id) ? 'bg-lime border-lime text-black' : 'border-zinc-600 group-hover:border-zinc-400'}`}>
                                                    {filters.userIds.includes(emp.id) && <Check className="h-3.5 w-3.5" />}
                                                </div>
                                                <span className="text-sm text-zinc-200 truncate">{emp.firstName} {emp.lastName}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 6. Approved By (Static) */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-zinc-400">Approved By</label>
                                <input
                                    type="text"
                                    placeholder="Admin name"
                                    className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-500 focus:outline-none cursor-not-allowed"
                                    disabled
                                    value={filters.approvedBy}
                                />
                            </div>

                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/10 bg-[#121212] flex gap-3">
                            <button
                                onClick={handleClear}
                                className="flex-1 py-2.5 rounded-lg border border-white/10 text-white font-medium hover:bg-white/5 transition-colors"
                            >
                                Clear
                            </button>
                            <button
                                onClick={handleApply}
                                className="flex-1 py-2.5 rounded-lg bg-lime text-black font-bold hover:bg-lime/90 transition-colors shadow-[0_0_15px_rgba(204,255,0,0.2)]"
                            >
                                Find
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
