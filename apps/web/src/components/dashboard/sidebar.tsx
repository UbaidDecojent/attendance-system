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
    Menu
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

export default function Sidebar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const user = useAuthStore((state) => state.user);
    const isAdmin = ['COMPANY_ADMIN', 'HR_MANAGER'].includes(user?.role || '');
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
                <div className="px-3 mb-4">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Main Menu
                    </span>
                </div>
                {navigation.filter(item => isAdmin || item.name !== 'Employees').map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                            'sidebar-link',
                            isActive(item.href) && 'active'
                        )}
                    >
                        <item.icon className="h-5 w-5" />
                        {item.name}
                    </Link>
                ))}
            </div>

            <div className="border-t pt-4">
                <div className="px-3 mb-4">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Settings
                    </span>
                </div>
                {bottomNavigation.filter(item => isAdmin || item.name !== 'Billing').map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                            'sidebar-link',
                            isActive(item.href) && 'active'
                        )}
                    >
                        <item.icon className="h-5 w-5" />
                        {item.name}
                    </Link>
                ))}
                <button
                    onClick={() => logout()}
                    className="sidebar-link w-full text-left text-destructive hover:text-destructive hover:bg-destructive/5"
                >
                    <LogOut className="h-5 w-5" />
                    Logout
                </button>
            </div>

            {/* User Info */}
            <div className="border-t pt-4 mt-4">
                <div className="flex items-center gap-3 px-4 py-2">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-medium">
                        {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.role.replace('_', ' ')}</p>
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile menu button */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-background border shadow-sm"
            >
                <Menu className="h-6 w-6" />
            </button>

            {/* Mobile sidebar */}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div
                        className="fixed inset-0 bg-black/50"
                        onClick={() => setMobileOpen(false)}
                    />
                    <div className="relative w-72 bg-background flex flex-col p-4">
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="absolute top-4 right-4 p-2"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="flex items-center gap-2 mb-8">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                                <Clock className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xl font-bold">AttendancePro</span>
                        </div>

                        <NavLinks />
                    </div>
                </div>
            )}

            {/* Desktop sidebar */}
            <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-72 border-r bg-background flex-col p-4">
                <div className="flex items-center gap-2 mb-8">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xl font-bold">AttendancePro</span>
                </div>

                <NavLinks />
            </aside>
        </>
    );
}
