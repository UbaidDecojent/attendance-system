'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, Users, FileText, Calendar, Settings, Building2, CreditCard, Bell, BarChart3, UserCheck, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { cn } from '@/lib/utils';

interface SearchSuggestion {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    href: string;
    category: 'page' | 'action' | 'employee' | 'report';
    roles?: string[]; // If empty, available to all
}

// Define all searchable items
const allSuggestions: SearchSuggestion[] = [
    // Pages - Available to admins and managers
    { id: 'dashboard', title: 'Dashboard', description: 'Overview and statistics', icon: <BarChart3 className="h-4 w-4" />, href: '/dashboard', category: 'page' },
    { id: 'attendance', title: 'Attendance', description: 'View and manage attendance', icon: <UserCheck className="h-4 w-4" />, href: '/dashboard/attendance', category: 'page' },
    { id: 'employees', title: 'Employees', description: 'Manage employee directory', icon: <Users className="h-4 w-4" />, href: '/dashboard/employees', category: 'page', roles: ['COMPANY_ADMIN', 'MANAGER'] },
    { id: 'departments', title: 'Departments', description: 'Manage departments', icon: <Building2 className="h-4 w-4" />, href: '/dashboard/departments', category: 'page', roles: ['COMPANY_ADMIN'] },
    { id: 'leaves', title: 'Leaves', description: 'Leave requests and approvals', icon: <Calendar className="h-4 w-4" />, href: '/dashboard/leaves', category: 'page' },
    { id: 'holidays', title: 'Holidays', description: 'Company holidays calendar', icon: <Calendar className="h-4 w-4" />, href: '/dashboard/holidays', category: 'page' },
    { id: 'reports', title: 'Reports', description: 'Analytics and reports', icon: <FileText className="h-4 w-4" />, href: '/dashboard/reports', category: 'page', roles: ['COMPANY_ADMIN', 'MANAGER'] },
    { id: 'settings', title: 'Settings', description: 'Account and company settings', icon: <Settings className="h-4 w-4" />, href: '/dashboard/settings', category: 'page' },
    { id: 'billing', title: 'Billing', description: 'Subscription and payments', icon: <CreditCard className="h-4 w-4" />, href: '/dashboard/billing', category: 'page', roles: ['COMPANY_ADMIN'] },
    { id: 'notifications', title: 'Notifications', description: 'View all notifications', icon: <Bell className="h-4 w-4" />, href: '/dashboard/notifications', category: 'page' },

    // Quick Actions
    { id: 'add-employee', title: 'Add New Employee', description: 'Create a new employee record', icon: <Users className="h-4 w-4" />, href: '/dashboard/employees?action=add', category: 'action', roles: ['COMPANY_ADMIN', 'MANAGER'] },
    { id: 'add-department', title: 'Add Department', description: 'Create a new department', icon: <Building2 className="h-4 w-4" />, href: '/dashboard/departments?action=add', category: 'action', roles: ['COMPANY_ADMIN'] },
    { id: 'request-leave', title: 'Request Leave', description: 'Submit a leave request', icon: <Calendar className="h-4 w-4" />, href: '/dashboard/leaves?action=request', category: 'action' },
    { id: 'export-report', title: 'Export Report', description: 'Download attendance reports', icon: <FileText className="h-4 w-4" />, href: '/dashboard/reports?action=export', category: 'action', roles: ['COMPANY_ADMIN', 'MANAGER'] },
    { id: 'clock-in', title: 'Clock In', description: 'Record attendance check-in', icon: <Clock className="h-4 w-4" />, href: '/dashboard/attendance?action=clockin', category: 'action' },
    { id: 'clock-out', title: 'Clock Out', description: 'Record attendance check-out', icon: <Clock className="h-4 w-4" />, href: '/dashboard/attendance?action=clockout', category: 'action' },

    // Reports
    { id: 'attendance-report', title: 'Attendance Report', description: 'Daily attendance summary', icon: <BarChart3 className="h-4 w-4" />, href: '/dashboard/reports?type=attendance', category: 'report', roles: ['COMPANY_ADMIN', 'MANAGER'] },
    { id: 'leave-report', title: 'Leave Report', description: 'Leave usage statistics', icon: <BarChart3 className="h-4 w-4" />, href: '/dashboard/reports?type=leaves', category: 'report', roles: ['COMPANY_ADMIN', 'MANAGER'] },
    { id: 'department-report', title: 'Department Report', description: 'Department-wise analytics', icon: <BarChart3 className="h-4 w-4" />, href: '/dashboard/reports?type=department', category: 'report', roles: ['COMPANY_ADMIN', 'MANAGER'] },
];

const categoryLabels: Record<string, string> = {
    page: 'Pages',
    action: 'Quick Actions',
    employee: 'Employees',
    report: 'Reports',
};

export default function GlobalSearch() {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter suggestions based on user role
    const getFilteredSuggestions = useCallback(() => {
        const userRole = user?.role || 'EMPLOYEE';

        return allSuggestions.filter(suggestion => {
            // If no roles specified, available to all
            if (!suggestion.roles || suggestion.roles.length === 0) return true;
            // Check if user role matches
            return suggestion.roles.includes(userRole);
        });
    }, [user?.role]);

    // Get matching suggestions based on query
    const getMatchingSuggestions = useCallback(() => {
        const filtered = getFilteredSuggestions();

        if (!query.trim()) {
            // Show recent + popular when no query
            return filtered.slice(0, 8);
        }

        const searchQuery = query.toLowerCase();
        return filtered.filter(suggestion =>
            suggestion.title.toLowerCase().includes(searchQuery) ||
            suggestion.description.toLowerCase().includes(searchQuery)
        );
    }, [query, getFilteredSuggestions]);

    const suggestions = getMatchingSuggestions();

    // Group suggestions by category
    const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
        if (!acc[suggestion.category]) {
            acc[suggestion.category] = [];
        }
        acc[suggestion.category].push(suggestion);
        return acc;
    }, {} as Record<string, SearchSuggestion[]>);

    // Load recent searches from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('recentSearches');
        if (stored) {
            setRecentSearches(JSON.parse(stored));
        }
    }, []);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + K to open search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 0);
            }

            // Escape to close
            if (e.key === 'Escape') {
                setIsOpen(false);
                setQuery('');
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Handle navigation with keyboard
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter' && suggestions[selectedIndex]) {
                e.preventDefault();
                handleSelect(suggestions[selectedIndex]);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, suggestions]);

    // Reset selected index when suggestions change
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (suggestion: SearchSuggestion) => {
        // Save to recent searches
        const newRecent = [suggestion.title, ...recentSearches.filter(s => s !== suggestion.title)].slice(0, 5);
        setRecentSearches(newRecent);
        localStorage.setItem('recentSearches', JSON.stringify(newRecent));

        // Navigate
        router.push(suggestion.href);
        setIsOpen(false);
        setQuery('');
    };

    const clearRecentSearches = () => {
        setRecentSearches([]);
        localStorage.removeItem('recentSearches');
    };

    return (
        <div ref={containerRef} className="flex-1 max-w-xl relative">
            {/* Search Input */}
            <div className="relative group">
                <Search className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
                    isOpen ? "text-lime" : "text-zinc-500 group-focus-within:text-lime"
                )} />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Search employees, reports..."
                    className={cn(
                        "w-full pl-11 pr-20 py-3 rounded-2xl border bg-zinc-900/50 text-sm text-white placeholder:text-zinc-600 focus:outline-none transition-all font-medium",
                        isOpen
                            ? "border-lime/50 ring-1 ring-lime/30"
                            : "border-white/5 focus:ring-1 focus:ring-lime/50 focus:border-lime/50"
                    )}
                />
                {/* Keyboard shortcut hint */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
                    {query ? (
                        <button
                            onClick={() => setQuery('')}
                            className="p-1 hover:bg-zinc-800 rounded transition-colors"
                        >
                            <X className="h-4 w-4 text-zinc-500" />
                        </button>
                    ) : (
                        <kbd className="px-2 py-1 text-xs font-medium text-zinc-500 bg-zinc-800 rounded border border-zinc-700">
                            ⌘K
                        </kbd>
                    )}
                </div>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                    {/* Recent Searches */}
                    {!query && recentSearches.length > 0 && (
                        <div className="p-3 border-b border-zinc-800">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Recent</span>
                                <button
                                    onClick={clearRecentSearches}
                                    className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {recentSearches.map((search, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setQuery(search)}
                                        className="px-3 py-1.5 text-xs font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                                    >
                                        {search}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Suggestions */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {suggestions.length > 0 ? (
                            Object.entries(groupedSuggestions).map(([category, items]) => (
                                <div key={category}>
                                    <div className="px-4 py-2 bg-zinc-800/50">
                                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                            {categoryLabels[category] || category}
                                        </span>
                                    </div>
                                    {items.map((suggestion, index) => {
                                        const globalIndex = suggestions.indexOf(suggestion);
                                        return (
                                            <button
                                                key={suggestion.id}
                                                onClick={() => handleSelect(suggestion)}
                                                onMouseEnter={() => setSelectedIndex(globalIndex)}
                                                className={cn(
                                                    "w-full px-4 py-3 flex items-center gap-4 transition-colors text-left",
                                                    globalIndex === selectedIndex
                                                        ? "bg-lime/10 text-white"
                                                        : "hover:bg-zinc-800/50 text-zinc-300"
                                                )}
                                            >
                                                <div className={cn(
                                                    "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                                                    globalIndex === selectedIndex
                                                        ? "bg-lime/20 text-lime"
                                                        : "bg-zinc-800 text-zinc-400"
                                                )}>
                                                    {suggestion.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{suggestion.title}</p>
                                                    <p className="text-xs text-zinc-500 truncate">{suggestion.description}</p>
                                                </div>
                                                {globalIndex === selectedIndex && (
                                                    <kbd className="px-2 py-1 text-xs font-medium text-zinc-500 bg-zinc-800 rounded border border-zinc-700 shrink-0">
                                                        Enter
                                                    </kbd>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center">
                                <Search className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
                                <p className="text-zinc-500 font-medium">No results found</p>
                                <p className="text-zinc-600 text-sm mt-1">Try searching for pages, actions, or reports</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-600">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-500">↑</kbd>
                                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-500">↓</kbd>
                                <span className="ml-1">Navigate</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-500">↵</kbd>
                                <span className="ml-1">Select</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-500">Esc</kbd>
                                <span className="ml-1">Close</span>
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
