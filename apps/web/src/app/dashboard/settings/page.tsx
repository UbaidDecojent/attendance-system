'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Settings, User, Bell, Shield, CreditCard, Building2 } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { cn } from '@/lib/utils';
import api from '@/lib/api/client';
import { toast } from 'sonner';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const user = useAuthStore((state) => state.user);
    const isAdmin = ['COMPANY_ADMIN', 'HR_MANAGER'].includes(user?.role || '');

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'company', label: 'Company', icon: Building2 },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar */}
                <div className="lg:w-64 glass-card rounded-2xl p-4 h-fit">
                    <nav className="space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${activeTab === tab.id
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'hover:bg-muted text-muted-foreground'
                                    }`}
                            >
                                <tab.icon className="h-5 w-5" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 glass-card rounded-2xl p-6">
                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold">Profile Settings</h2>

                            {/* Avatar */}
                            <div className="flex items-center gap-4">
                                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                                </div>
                                <div>
                                    <button className="px-4 py-2 rounded-lg border hover:bg-muted transition-colors text-sm font-medium">
                                        Change Avatar
                                    </button>
                                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF. Max 2MB</p>
                                </div>
                            </div>

                            {/* Form */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">First Name</label>
                                    <input
                                        type="text"
                                        defaultValue={user?.firstName}
                                        className="w-full px-4 py-3 rounded-xl border bg-background input-focus-ring"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Last Name</label>
                                    <input
                                        type="text"
                                        defaultValue={user?.lastName}
                                        className="w-full px-4 py-3 rounded-xl border bg-background input-focus-ring"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-sm font-medium mb-2 block">Email</label>
                                    <input
                                        type="email"
                                        defaultValue={user?.email}
                                        disabled
                                        className="w-full px-4 py-3 rounded-xl border bg-muted text-muted-foreground"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => toast.success('Profile updated!')}
                                className="btn-premium px-6 py-2.5"
                            >
                                Save Changes
                            </button>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold">Security Settings</h2>

                            {/* Change Password */}
                            <div className="space-y-4 pb-6 border-b">
                                <h3 className="font-medium">Change Password</h3>
                                <div className="grid gap-4 max-w-md">
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">Current Password</label>
                                        <input
                                            type="password"
                                            className="w-full px-4 py-3 rounded-xl border bg-background input-focus-ring"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">New Password</label>
                                        <input
                                            type="password"
                                            className="w-full px-4 py-3 rounded-xl border bg-background input-focus-ring"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">Confirm New Password</label>
                                        <input
                                            type="password"
                                            className="w-full px-4 py-3 rounded-xl border bg-background input-focus-ring"
                                        />
                                    </div>
                                    <button className="btn-premium px-6 py-2.5 w-fit">Update Password</button>
                                </div>
                            </div>

                            {/* Two-Factor Auth */}
                            <div className="space-y-4">
                                <h3 className="font-medium">Two-Factor Authentication</h3>
                                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                                    <div>
                                        <p className="font-medium">Authenticator App</p>
                                        <p className="text-sm text-muted-foreground">
                                            Use an authenticator app to generate one-time codes
                                        </p>
                                    </div>
                                    <button className="px-4 py-2 rounded-lg border hover:bg-muted transition-colors text-sm font-medium">
                                        Enable
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold">Notification Preferences</h2>

                            <div className="space-y-4">
                                {[
                                    { label: 'Attendance reminders', description: 'Get reminded to check in' },
                                    { label: 'Leave request updates', description: 'When your leave is approved or rejected' },
                                    { label: 'Team notifications', description: 'Updates about your team members' },
                                    { label: 'Weekly summary', description: 'Weekly attendance summary email' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                                        <div>
                                            <p className="font-medium">{item.label}</p>
                                            <p className="text-sm text-muted-foreground">{item.description}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" defaultChecked className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'company' && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold">Company Settings</h2>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="text-sm font-medium mb-2 block">Company Name</label>
                                    <input
                                        type="text"
                                        defaultValue={user?.companyName}
                                        disabled={!isAdmin}
                                        className={cn(
                                            "w-full px-4 py-3 rounded-xl border bg-background input-focus-ring",
                                            !isAdmin && "bg-muted text-muted-foreground"
                                        )}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Timezone</label>
                                    <select
                                        disabled={!isAdmin}
                                        className={cn(
                                            "w-full px-4 py-3 rounded-xl border bg-background input-focus-ring",
                                            !isAdmin && "bg-muted text-muted-foreground"
                                        )}
                                    >
                                        <option>America/New_York</option>
                                        <option>America/Los_Angeles</option>
                                        <option>Europe/London</option>
                                        <option>Asia/Karachi</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Date Format</label>
                                    <select
                                        disabled={!isAdmin}
                                        className={cn(
                                            "w-full px-4 py-3 rounded-xl border bg-background input-focus-ring",
                                            !isAdmin && "bg-muted text-muted-foreground"
                                        )}
                                    >
                                        <option>MM/DD/YYYY</option>
                                        <option>DD/MM/YYYY</option>
                                        <option>YYYY-MM-DD</option>
                                    </select>
                                </div>
                            </div>

                            {isAdmin && (
                                <button className="btn-premium px-6 py-2.5">Save Changes</button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
