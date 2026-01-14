'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { Settings, User, Bell, Shield, CreditCard, Building2, MapPin, Edit3, Clock } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { cn } from '@/lib/utils';
import api from '@/lib/api/client';
import { companyApi } from '@/lib/api/company';
import { toast } from 'sonner';
import { authApi } from '@/lib/api/auth';
import SecuritySettings from '@/components/dashboard/security-settings';
import NotificationSettings from '@/components/dashboard/notification-settings';
import ShiftSettings from '@/components/dashboard/shift-settings';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const [showAddLocation, setShowAddLocation] = useState(false);
    const [newLocation, setNewLocation] = useState({ name: '', latitude: 0, longitude: 0, radius: 100 });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { user, updateUser } = useAuthStore();
    const isAdmin = ['COMPANY_ADMIN', 'HR_MANAGER'].includes(user?.role || '');
    const queryClient = useQueryClient();

    const [profileForm, setProfileForm] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || ''
    });

    useEffect(() => {
        if (user) {
            setProfileForm({
                firstName: user.firstName || '',
                lastName: user.lastName || ''
            });
        }
    }, [user]);

    const updateProfileMutation = useMutation({
        mutationFn: (data: { firstName?: string; lastName?: string; avatar?: string }) => authApi.updateProfile(data),
        onSuccess: (updatedUser) => {
            updateUser(updatedUser);
            toast.success('Profile updated successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update profile');
        }
    });

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error('File size must be less than 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            updateProfileMutation.mutate({ avatar: base64String });
        };
        reader.readAsDataURL(file);
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'company', label: 'Company', icon: Building2 },
        { id: 'shifts', label: 'Shifts', icon: Clock },
        { id: 'office', label: 'Office Locations', icon: MapPin },
    ];

    const { data: locations } = useQuery({
        queryKey: ['officeLocations'],
        queryFn: () => companyApi.getOfficeLocations(),
        enabled: activeTab === 'office' && isAdmin
    });

    const addLocationMutation = useMutation({
        mutationFn: (data: any) => companyApi.addOfficeLocation(data),
        onSuccess: () => {
            toast.success('Office location added successfully');
            setShowAddLocation(false);
            setNewLocation({ name: '', latitude: 0, longitude: 0, radius: 100 });
            queryClient.invalidateQueries({ queryKey: ['officeLocations'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to add location');
        }
    });

    const handleAddLocation = () => {
        addLocationMutation.mutate(newLocation);
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar */}
                <div className="lg:w-64 bg-[#111111] border border-white/5 rounded-[1.5rem] p-4 h-fit">
                    <nav className="space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all font-bold text-sm",
                                    activeTab === tab.id
                                        ? 'bg-lime text-black shadow-[0_0_20px_rgba(204,255,0,0.3)]'
                                        : 'text-zinc-500 hover:bg-zinc-900 hover:text-white'
                                )}
                            >
                                <tab.icon className={cn("h-5 w-5", activeTab === tab.id ? "text-black" : "text-zinc-500")} />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 bg-[#111111] border border-white/5 rounded-[2rem] p-8">
                    {activeTab === 'profile' && (
                        <div className="space-y-8">
                            <h2 className="text-xl font-bold text-white">Profile Settings</h2>

                            {/* Avatar */}
                            <div className="flex items-center gap-6">
                                <div className="h-24 w-24 rounded-full bg-zinc-900 border-2 border-white/10 flex items-center justify-center text-white text-3xl font-bold overflow-hidden relative">
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" />
                                    ) : (
                                        <span>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span>
                                    )}
                                </div>
                                <div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/png, image/jpeg, image/gif"
                                        onChange={handleFileChange}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-6 py-2.5 rounded-full border border-white/10 hover:bg-zinc-900 text-white font-bold text-sm transition-colors bg-black"
                                    >
                                        Change Avatar
                                    </button>
                                    <p className="text-xs font-medium text-zinc-500 mt-2 uppercase tracking-wide">JPG, PNG or GIF. Max 2MB</p>
                                </div>
                            </div>

                            {/* Form */}
                            <div className="grid sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">First Name</label>
                                    <input
                                        type="text"
                                        value={profileForm.firstName}
                                        onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Last Name</label>
                                    <input
                                        type="text"
                                        value={profileForm.lastName}
                                        onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Email</label>
                                    <input
                                        type="email"
                                        defaultValue={user?.email}
                                        disabled
                                        className="w-full px-4 py-3 rounded-xl border border-white/5 bg-black/50 text-zinc-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => updateProfileMutation.mutate(profileForm)}
                                disabled={updateProfileMutation.isPending}
                                className="bg-lime hover:bg-lime-400 text-black px-8 py-3 rounded-full font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <SecuritySettings />
                    )}


                    {
                        activeTab === 'notifications' && (
                            <NotificationSettings />
                        )
                    }

                    {
                        activeTab === 'company' && (
                            <div className="space-y-8">
                                <h2 className="text-xl font-bold text-white">Company Settings</h2>

                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Company Name</label>
                                        <input
                                            type="text"
                                            defaultValue={user?.companyName}
                                            disabled={!isAdmin}
                                            className={cn(
                                                "w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all",
                                                !isAdmin && "bg-black/50 text-zinc-500 cursor-not-allowed"
                                            )}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Timezone</label>
                                        <select
                                            disabled={!isAdmin}
                                            className={cn(
                                                "w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all",
                                                !isAdmin && "bg-black/50 text-zinc-500 cursor-not-allowed"
                                            )}
                                        >
                                            <option>America/New_York</option>
                                            <option>America/Los_Angeles</option>
                                            <option>Europe/London</option>
                                            <option>Asia/Karachi</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Date Format</label>
                                        <select
                                            disabled={!isAdmin}
                                            className={cn(
                                                "w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all",
                                                !isAdmin && "bg-black/50 text-zinc-500 cursor-not-allowed"
                                            )}
                                        >
                                            <option>MM/DD/YYYY</option>
                                            <option>DD/MM/YYYY</option>
                                            <option>YYYY-MM-DD</option>
                                        </select>
                                    </div>
                                </div>

                                {isAdmin && (
                                    <button className="bg-lime hover:bg-lime-400 text-black px-8 py-3 rounded-full font-bold transition-all hover:scale-105">
                                        Save Changes
                                    </button>
                                )}
                            </div>
                        )
                    }

                    {
                        activeTab === 'shifts' && (
                            <ShiftSettings />
                        )
                    }

                    {
                        activeTab === 'office' && (
                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Office Locations</h2>
                                        <p className="text-sm text-zinc-500 font-medium">Manage allowed geofencing locations for attendance</p>
                                    </div>
                                    {isAdmin && (
                                        <button
                                            onClick={() => setShowAddLocation(true)}
                                            className="bg-lime hover:bg-lime-400 text-black px-6 py-2.5 rounded-full font-bold transition-all text-sm flex items-center gap-2 hover:scale-105"
                                        >
                                            <MapPin className="h-4 w-4" />
                                            Add Location
                                        </button>
                                    )}
                                </div>

                                {/* Locations List */}
                                <div className="grid gap-4">
                                    {locations?.map((loc: any) => (
                                        <div key={loc.id} className="bg-zinc-900/30 p-6 rounded-[1.5rem] flex items-center justify-between border border-white/5 hover:border-lime/30 transition-all group">
                                            <div className="flex items-center gap-6">
                                                <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center group-hover:bg-lime/10 group-hover:border-lime/20 transition-colors">
                                                    <MapPin className="h-6 w-6 text-zinc-500 group-hover:text-lime transition-colors" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white text-lg group-hover:text-lime transition-colors">{loc.name}</h3>
                                                    <p className="text-sm text-zinc-500 font-medium flex items-center gap-3 mt-1">
                                                        <span>Lat: {loc.latitude.toFixed(4)}</span>
                                                        <span>Lng: {loc.longitude.toFixed(4)}</span>
                                                        <span className="bg-zinc-800 px-2 py-0.5 rounded text-xs">Radius: {loc.radius}m</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className={`px-3 py-1 rounded-lg text-xs font-bold border uppercase tracking-wider ${loc.isActive ? 'bg-lime/10 text-lime border-lime/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                    {loc.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                                {isAdmin && (
                                                    <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors">
                                                        <Edit3 className="h-5 w-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {locations?.length === 0 && (
                                        <div className="text-center py-16 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                                            No office locations defined.
                                        </div>
                                    )}
                                </div>

                                {/* Add Location Form */}
                                {showAddLocation && (
                                    <div className="bg-[#0A0A0A] p-8 rounded-[1.5rem] border border-lime/20 mt-6 animate-in slide-in-from-top-4 duration-300">
                                        <h3 className="font-bold text-white text-lg mb-6">Add New Location</h3>
                                        <div className="grid sm:grid-cols-2 gap-6 mb-6">
                                            <div className="sm:col-span-2">
                                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Location Name</label>
                                                <input
                                                    value={newLocation.name}
                                                    onChange={e => setNewLocation({ ...newLocation, name: e.target.value })}
                                                    placeholder="e.g. Head Office"
                                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Latitude</label>
                                                <input
                                                    type="number"
                                                    value={newLocation.latitude}
                                                    onChange={e => setNewLocation({ ...newLocation, latitude: parseFloat(e.target.value) })}
                                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Longitude</label>
                                                <input
                                                    type="number"
                                                    value={newLocation.longitude}
                                                    onChange={e => setNewLocation({ ...newLocation, longitude: parseFloat(e.target.value) })}
                                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Radius (meters)</label>
                                                <input
                                                    type="number"
                                                    value={newLocation.radius}
                                                    onChange={e => setNewLocation({ ...newLocation, radius: parseFloat(e.target.value) })}
                                                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all"
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <button
                                                    onClick={() => {
                                                        navigator.geolocation.getCurrentPosition(pos => {
                                                            setNewLocation({
                                                                ...newLocation,
                                                                latitude: pos.coords.latitude,
                                                                longitude: pos.coords.longitude
                                                            });
                                                            toast.success('Location fetched!');
                                                        }, err => toast.error('Could not get location'));
                                                    }}
                                                    className="w-full px-4 py-3 rounded-xl border border-lime/30 bg-lime/10 text-lime font-bold hover:bg-lime/20 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <MapPin className="h-4 w-4" />
                                                    Use Current Location
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-3 pt-2">
                                            <button
                                                onClick={() => setShowAddLocation(false)}
                                                className="px-6 py-3 rounded-xl hover:bg-zinc-900 text-white font-bold transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleAddLocation}
                                                disabled={!newLocation.name || !newLocation.latitude || !newLocation.longitude}
                                                className="bg-lime hover:bg-lime-400 text-black px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Save Location
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    }
                </div >
            </div >
        </div >
    );
}
