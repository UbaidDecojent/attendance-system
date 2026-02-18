'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Clock,
    Users,
    Building2,
    Calendar,
    CalendarDays,
    BarChart3,
    Settings,
    CreditCard,
    LogOut,
    X,
    Menu,
    Briefcase,
    Layers,
    Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useState } from 'react';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Attendance', href: '/dashboard/attendance', icon: Clock },
    { name: 'Employees', href: '/dashboard/employees', icon: Users },
    { name: 'Departments', href: '/dashboard/departments', icon: Building2 },
    { name: 'Leaves', href: '/dashboard/leaves', icon: Calendar },
    { name: 'Holidays', href: '/dashboard/holidays', icon: CalendarDays },
    { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
];

const bottomNavigation = [
    { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const projectNavigation = [
    { name: 'Projects', href: '/dashboard/projects', icon: Briefcase },
    { name: 'Tasks', href: '/dashboard/tasks', icon: Layers },
    { name: 'Time Logs', href: '/dashboard/time-logs', icon: Timer },
    { name: 'Workload', href: '/dashboard/workload', icon: BarChart3, adminOnly: true },
];

export default function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const user = useAuthStore((state) => state.user);
    const isAdmin = ['COMPANY_ADMIN'].includes(user?.role || '');
    const isManager = user?.role === 'TEAM_MANAGER';
    const isHr = user?.role === 'HR_MANAGER';
    const hasProjectAccess = isAdmin || isManager;
    const logout = useAuthStore((state) => state.logout);

    const isActive = (href: string) => {
        if (href === '/dashboard') {
            return pathname === href;
        }
        return pathname.startsWith(href);
    };

    const NavLinks = () => (
        <>
            <div className="flex-1 flex flex-col gap-1">
                <div className={cn("px-4 mb-2 transition-opacity duration-300", collapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100")}>
                    <span className="text-xs font-medium text-zinc-600 uppercase tracking-widest pl-2">
                        Main Menu
                    </span>
                </div>
                {navigation.filter(item => isAdmin || isHr || item.name !== 'Employees').map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                            'flex items-center gap-4 px-3 py-3 rounded-[2rem] transition-all duration-300 group relative mx-2',
                            collapsed ? "justify-center" : "",
                            isActive(item.href)
                                ? 'bg-lime text-black font-semibold shadow-[0_0_20px_rgba(204,255,0,0.1)]'
                                : 'text-zinc-300 hover:text-white hover:bg-white/5'
                        )}
                        title={collapsed ? item.name : undefined}
                    >
                        <div className={cn(
                            "h-6 w-6 flex items-center justify-center transition-colors duration-300",
                            isActive(item.href) ? "text-black" : "text-current"
                        )}>
                            <item.icon className="h-5 w-5" />
                        </div>
                        {!collapsed && (
                            <span className="relative z-10 whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</span>
                        )}
                    </Link>
                ))}

                {/* Project Management */}
                <div className={cn("px-4 mb-2 mt-4 transition-opacity duration-300", collapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100")}>
                    <span className="text-xs font-medium text-zinc-600 uppercase tracking-widest pl-2">
                        Project Management
                    </span>
                </div>
                {projectNavigation.filter(item => !item.adminOnly || isAdmin || isManager).map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                            'flex items-center gap-4 px-3 py-3 rounded-[2rem] transition-all duration-300 group relative mx-2',
                            collapsed ? "justify-center" : "",
                            isActive(item.href)
                                ? 'bg-lime text-black font-semibold shadow-[0_0_20px_rgba(204,255,0,0.1)]'
                                : 'text-zinc-300 hover:text-white hover:bg-white/5'
                        )}
                        title={collapsed ? item.name : undefined}
                    >
                        <div className={cn(
                            "h-6 w-6 flex items-center justify-center transition-colors duration-300",
                            isActive(item.href) ? "text-black" : "text-current"
                        )}>
                            <item.icon className="h-5 w-5" />
                        </div>
                        {!collapsed && (
                            <span className="relative z-10 whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</span>
                        )}
                    </Link>
                ))}
            </div>

            <div className={cn("pt-2 mt-2 border-t border-white/5", collapsed ? "border-t-0" : "")}>
                <div className={cn("px-4 mb-2 transition-opacity duration-300", collapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100")}>
                    <span className="text-xs font-medium text-zinc-600 uppercase tracking-widest pl-2">
                        Settings
                    </span>
                </div>
                {bottomNavigation.filter(item => isAdmin || item.name !== 'Billing').map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                            'flex items-center gap-4 px-3 py-3 rounded-[2rem] transition-all duration-300 group mx-2',
                            collapsed ? "justify-center" : "",
                            isActive(item.href)
                                ? 'bg-lime text-black font-semibold'
                                : 'text-zinc-300 hover:text-white hover:bg-white/5'
                        )}
                        title={collapsed ? item.name : undefined}
                    >
                        <div className={cn(
                            "h-6 w-6 flex items-center justify-center transition-colors duration-300",
                            isActive(item.href) ? "text-black" : "text-current"
                        )}>
                            <item.icon className="h-5 w-5" />
                        </div>
                        {!collapsed && (
                            <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</span>
                        )}
                    </Link>
                ))}
                <button
                    onClick={() => logout()}
                    className={cn(
                        "flex items-center gap-4 px-3 py-3 rounded-[2rem] text-zinc-300 hover:text-red-400 hover:bg-white/5 transition-all duration-300 group mt-1 mx-2",
                        collapsed ? "justify-center" : ""
                    )}
                    title="Logout"
                >
                    <div className="h-6 w-6 flex items-center justify-center transition-colors">
                        <LogOut className="h-5 w-5" />
                    </div>
                    {!collapsed && "Logout"}
                </button>
            </div>

            {/* User Info */}
            <div className={cn("mt-auto pt-6 pb-4", collapsed ? "" : "px-4")}>
                <div className={cn(
                    "flex items-center gap-3 p-1 transition-colors cursor-pointer",
                    collapsed ? "justify-center" : ""
                )}>
                    <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-white font-medium border border-white/10 overflow-hidden relative">
                        {user?.avatar ? (
                            <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                            <span>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span>
                        )}
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user?.firstName} {user?.lastName}</p>
                            <p className="text-xs text-zinc-500 truncate">{user?.role.replace('_', ' ')}</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile menu button */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-full bg-black border border-white/10 text-white shadow-sm"
            >
                <Menu className="h-6 w-6" />
            </button>

            {/* Mobile sidebar */}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div
                        className="fixed inset-0 bg-black/90 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    />
                    <div className="relative w-72 bg-black border-r border-white/10 flex flex-col p-4">
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-10 px-4 mt-4">
                            <div className="h-10 w-10 rounded-xl bg-lime shadow-[0_0_15px_rgba(204,255,0,0.3)] flex items-center justify-center">
                                <Clock className="h-5 w-5 text-black transform -rotate-12 stroke-2" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xl font-bold text-white tracking-tight leading-none">
                                    ATTENDIFY<span className="text-lime">.</span>
                                </span>
                                <span className="text-[10px] font-medium text-zinc-500 tracking-[0.2em] uppercase">
                                    MANAGEMENT
                                </span>
                            </div>
                        </div>

                        <NavLinks />
                    </div>
                </div>
            )}

            {/* Desktop sidebar content */}
            <div className="hidden lg:flex flex-col h-full bg-black p-4 overflow-y-auto border-r border-white/5">
                {/* Logo */}
                {/* Logo */}
                <div className={cn("flex items-center gap-3 mb-10 transition-all duration-300 h-16", collapsed ? "justify-center px-0" : "px-4")}>
                    <div className="h-10 w-10 rounded-xl bg-lime shadow-[0_0_15px_rgba(204,255,0,0.3)] flex items-center justify-center min-w-[40px] hover:scale-105 transition-transform">
                        <Clock className="h-5 w-5 text-black transform -rotate-12 stroke-2" />
                    </div>
                    {!collapsed && (
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xl font-bold text-white tracking-tight leading-none">
                                ATTENDIFY<span className="text-lime">.</span>
                            </span>
                            <span className="text-[10px] font-medium text-zinc-500 tracking-[0.2em] uppercase">
                                MANAGEMENT
                            </span>
                        </div>
                    )}
                </div>

                {/* Main Menu */}
                <NavLinks />
            </div>
        </>
    );
}
