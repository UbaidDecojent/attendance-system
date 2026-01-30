'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
    Users,
    Clock,
    Calendar,
    TrendingUp,
    ArrowUpRight,
    CheckCircle,
    XCircle,
    AlertCircle,
    PlayCircle,
    PauseCircle,
    AlertTriangle
} from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, CartesianGrid } from 'recharts';
import { useAuthStore } from '@/lib/stores/auth-store';
import { attendanceApi } from '@/lib/api/attendance';
import { formatTime, cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';

export default function DashboardPage() {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const isAdmin = ['COMPANY_ADMIN', 'HR_MANAGER'].includes(user?.role || '');
    const [checkingIn, setCheckingIn] = useState(false);
    const [checkingOut, setCheckingOut] = useState(false);
    const [showCheckoutConfirmation, setShowCheckoutConfirmation] = useState(false);

    // Date helpers for charts
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Live timer state for employee dashboard
    const [liveTime, setLiveTime] = useState(new Date());
    const [workingDuration, setWorkingDuration] = useState({ hours: 0, minutes: 0, seconds: 0 });

    const { data: todayStatus, refetch } = useQuery({
        queryKey: ['todayStatus'],
        queryFn: () => attendanceApi.getTodayStatus(),
        enabled: user?.role === 'EMPLOYEE',
    });

    const { data: dashboardStats, refetch: refetchStats, isRefetching } = useQuery({
        queryKey: ['dashboardStats'],
        queryFn: () => attendanceApi.getDashboard(),
        enabled: user?.role !== 'EMPLOYEE',
    });

    const { data: historyData, isLoading: historyLoading, isError: historyError } = useQuery({
        queryKey: ['attendanceHistory', user?.role, weekStart],
        queryFn: () => user?.role === 'EMPLOYEE'
            ? attendanceApi.getMyHistory({ startDate: weekStart.toISOString(), endDate: weekEnd.toISOString(), limit: 100 })
            : attendanceApi.getHistory({ startDate: weekStart.toISOString(), endDate: weekEnd.toISOString(), limit: 100 }),
        enabled: !!user,
        retry: 1
    });

    const chartData = weekDays.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        let value = 0;

        if (historyData?.items) {
            if (user?.role === 'EMPLOYEE') {
                const record = historyData.items.find((item: any) => format(new Date(item.date), 'yyyy-MM-dd') === dateStr);
                value = record ? Math.round((record.totalWorkMinutes || 0) / 60 * 10) / 10 : 0;
            } else {
                value = historyData.items.filter((item: any) =>
                    format(new Date(item.date), 'yyyy-MM-dd') === dateStr &&
                    (item.status === 'PRESENT' || item.status === 'HALF_DAY')
                ).length;
            }
        }
        return { name: format(day, 'EEE'), value, fullDate: dateStr };
    });

    // Live timer effect - updates every second
    useEffect(() => {
        const timer = setInterval(() => {
            setLiveTime(new Date());

            // Calculate working duration if checked in but not checked out
            if (todayStatus?.attendance?.checkInTime && !todayStatus?.attendance?.checkOutTime) {
                const checkInTime = new Date(todayStatus.attendance.checkInTime);
                const now = new Date();
                const diffMs = now.getTime() - checkInTime.getTime();
                const diffSeconds = Math.floor(diffMs / 1000);
                const hours = Math.floor(diffSeconds / 3600);
                const minutes = Math.floor((diffSeconds % 3600) / 60);
                const seconds = diffSeconds % 60;
                setWorkingDuration({ hours, minutes, seconds });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [todayStatus?.attendance?.checkInTime, todayStatus?.attendance?.checkOutTime]);

    const getAddressFromCoords = async (lat: number, lng: number) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            return data.display_name;
        } catch (error) {
            console.error('Reverse geocoding failed:', error);
            return undefined;
        }
    };

    const getCurrentLocation = async (): Promise<{ lat: number; lng: number; address?: string }> => {
        const getPosition = (options: PositionOptions): Promise<GeolocationPosition> => {
            return new Promise((resolve, reject) => {
                const id = navigator.geolocation.watchPosition(
                    (position) => {
                        navigator.geolocation.clearWatch(id);
                        resolve(position);
                    },
                    (error) => {
                        navigator.geolocation.clearWatch(id);
                        reject(error);
                    },
                    options
                );
            });
        };

        const formatError = (err: any) => `Code: ${err.code}, Msg: ${err.message}`;

        try {
            // Check permissions first if available
            if (navigator.permissions && navigator.permissions.query) {
                const result = await navigator.permissions.query({ name: 'geolocation' });
                if (result.state === 'denied') {
                    throw { code: 1, message: 'Permission denied by user' };
                }
            }

            console.log("📍 Starting location fetch: High Accuracy (GPS)");
            // Attempt 1: High Accuracy (GPS) - 30s timeout
            // Using watchPosition wrapper which is often more reliable
            const position = await getPosition({
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 0 // Force fresh reading
            });
            console.log("✅ High Accuracy Success:", position.coords);
            const { latitude, longitude } = position.coords;
            const address = await getAddressFromCoords(latitude, longitude);
            return { lat: latitude, lng: longitude, address };
        } catch (highError: any) {
            console.warn(`⚠️ High accuracy failed: ${formatError(highError)}`);

            if (highError.code === 1) { // PERMISSION_DENIED
                toast.error("Location permission denied. Please enable it in your browser settings.");
                throw highError;
            }

            // Specific feedback based on error code
            if (highError.code === 2) { // POSITION_UNAVAILABLE
                toast.error('GPS signal unavailable. Trying WiFi/Network location...');
            } else if (highError.code === 3) { // TIMEOUT
                toast.message('GPS Request timed out. Trying WiFi/Network location...');
            } else {
                toast.message('High accuracy failed. Trying standard location...');
            }

            try {
                console.log("📍 Fallback location fetch: Standard Accuracy");
                // Attempt 2: Low Accuracy (WiFi/IP) - 20s timeout
                // Relaxed constraints: standard accuracy, allow any cached position
                const position = await getPosition({
                    enableHighAccuracy: false,
                    timeout: 20000,
                    maximumAge: Infinity
                });
                console.log("✅ Standard Accuracy Success:", position.coords);
                const { latitude, longitude } = position.coords;
                const address = await getAddressFromCoords(latitude, longitude);
                return { lat: latitude, lng: longitude, address };
            } catch (lowError: any) {
                console.error(`❌ Standard accuracy failed: ${formatError(lowError)}`);

                if (lowError.code === 1) throw lowError;

                // Specific error for standard failure
                if (lowError.code === 2) {
                    toast.error('Device location unavailable. Ensure WiFi/GPS is enabled.');
                } else if (lowError.code === 3) {
                    toast.error('Location request timed out completely.');
                }

                toast.message('Location hardware failed. Using IP address as fallback...', { duration: 5000 });

                try {
                    const res = await fetch('https://ipwho.is/');
                    if (!res.ok) throw new Error('IPWhoIs failed');
                    const data = await res.json();
                    if (!data.success) throw new Error('IPWhoIs returned error');

                    return {
                        lat: data.latitude,
                        lng: data.longitude,
                        address: [data.city, data.region, data.country].filter(Boolean).join(', ')
                    };
                } catch (ipError) {
                    try {
                        const res = await fetch('https://ipapi.co/json/');
                        if (!res.ok) throw new Error('IPAPI failed');
                        const data = await res.json();
                        return {
                            lat: data.latitude,
                            lng: data.longitude,
                            address: [data.city, data.region, data.country_name].filter(Boolean).join(', ') || 'IP Location'
                        };
                    } catch (finalError) {
                        console.error('All location attempts critical fail:', finalError);
                        throw new Error('Could not determine location. Please check your network and permissions.');
                    }
                }
            }
        }
    };



    const handleCheckIn = async (attendanceType: 'OFFICE' | 'REMOTE' | 'FIELD' = 'OFFICE') => {
        setCheckingIn(true);
        const toastId = toast.loading('Getting location...');

        try {
            let location: { lat: number; lng: number; address?: string } | undefined = undefined;

            // Try to get location, but don't fail completely if it fails
            try {
                if (navigator.geolocation) {
                    location = await getCurrentLocation();
                }
            } catch (locError: any) {
                console.warn('Location fetch failed:', locError);
                // For OFFICE type, location is required
                if (attendanceType === 'OFFICE') {
                    toast.error('Location is required for Office check-in. Trying as Remote...', { id: toastId });
                    // Retry as REMOTE
                    await handleCheckIn('REMOTE');
                    return;
                }
                // For REMOTE/FIELD, continue without location
                toast.message('Checking in without location...', { id: toastId });
            }

            toast.loading('Processing check-in...', { id: toastId });

            try {
                await attendanceApi.checkIn({ type: attendanceType, location });
                toast.success(`Checked in successfully as ${attendanceType}!`, { id: toastId });
                refetch();
            } catch (apiError: any) {
                const errorMessage = apiError.response?.data?.message || '';

                // If outside geofence, automatically retry as REMOTE
                if (errorMessage.includes('geofence') || errorMessage.includes('outside') || errorMessage.includes('radius')) {
                    if (attendanceType === 'OFFICE') {
                        toast.message('Outside office area. Checking in as Remote...', { id: toastId });
                        await attendanceApi.checkIn({ type: 'REMOTE', location });
                        toast.success('Checked in successfully as Remote!', { id: toastId });
                        refetch();
                        return;
                    }
                }
                throw apiError;
            }
        } catch (error: any) {
            console.error('Check-in error:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Check-in failed';
            toast.error(errorMessage, { id: toastId });
        } finally {
            setCheckingIn(false);
        }
    };

    const initiateCheckOut = () => {
        setShowCheckoutConfirmation(true);
    };

    const performCheckOut = async () => {
        setShowCheckoutConfirmation(false);
        setCheckingOut(true);
        const toastId = toast.loading('Getting location...');

        try {
            if (!navigator.geolocation) throw new Error('Geolocation not supported');

            const location = await getCurrentLocation();

            toast.loading('Processing check-out...', { id: toastId });
            await attendanceApi.checkOut({ location });

            toast.success('Checked out successfully with location!', { id: toastId });
            refetch();
        } catch (error: any) {
            console.error('Check-out error:', error);
            if (error.code === 1 || error.message?.includes('Geolocation')) {
                toast.error('Location is required for check-out.', { id: toastId });
            } else {
                toast.error(error.response?.data?.message || 'Check-out failed', { id: toastId });
            }
        } finally {
            setCheckingOut(false);
        }
    };

    const getTimingStatus = (actualTime: string | null | undefined, shiftTime: string | undefined, type: 'start' | 'end') => {
        if (!actualTime || !shiftTime) return null;

        const actual = new Date(actualTime);
        const [hours, minutes] = shiftTime.split(':').map(Number);

        const shiftContext = new Date(actual);
        shiftContext.setHours(hours, minutes, 0, 0);

        const diffMinutes = Math.floor((actual.getTime() - shiftContext.getTime()) / 60000);
        const absDiff = Math.abs(diffMinutes);
        const formatDuration = (mins: number) => mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;

        if (type === 'start') {
            // Check In: Early (< 0), On Time (0-15), Late (> 15)
            if (diffMinutes < 0) return { label: `Early by ${formatDuration(absDiff)}`, color: 'text-lime', icon: CheckCircle };
            if (diffMinutes > 15) return { label: `Late by ${formatDuration(diffMinutes)}`, color: 'text-red-500', icon: AlertTriangle };
            return { label: 'On Time', color: 'text-zinc-500', icon: CheckCircle };
        } else {
            // Check Out: Early (< 0), Overtime (> 0)
            if (diffMinutes < 0) return { label: `Early by ${formatDuration(absDiff)}`, color: 'text-amber-500', icon: AlertTriangle };
            if (diffMinutes > 0) return { label: `OT by ${formatDuration(diffMinutes)}`, color: 'text-lime', icon: CheckCircle };
            return { label: 'On Time', color: 'text-zinc-500', icon: CheckCircle };
        }
    };

    const isEmployee = user?.role === 'EMPLOYEE';

    return (
        <div className="space-y-8">
            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column: Welcome & Summary */}
                <div className="lg:col-span-1 flex flex-col gap-8 h-full">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="h-2 w-2 rounded-full bg-lime animate-pulse shadow-[0_0_10px_#CCFF00]" />
                            <span className="text-xs font-medium text-lime uppercase tracking-widest">Live Updates</span>
                        </div>
                        <h1 className="text-5xl font-medium text-white tracking-tight leading-[1.1] mb-6">
                            Welcome<br />
                            <span className="text-zinc-500">Back,</span><br />
                            {user?.firstName}!
                        </h1>
                        <p className="text-zinc-400 font-normal leading-relaxed">
                            {isEmployee
                                ? "Ready to start your day? Don't forget to check in."
                                : "Here's what's happening with your team today."}
                        </p>
                    </div>

                    {/* Quick Insight / Today's Overview */}
                    <div className="bg-[#111111] border border-white/5 rounded-[2rem] p-6 space-y-6 flex-1 flex flex-col justify-between">
                        <div className="flex-1">
                            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                                <div>
                                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Today</p>
                                    <p className="text-xl font-semibold text-white">
                                        {format(today, 'EEEE, MMM do')}
                                    </p>
                                </div>
                                <Calendar className="h-6 w-6 text-white" />
                            </div>

                            <div className="flex-1 flex flex-col gap-3">
                                {isEmployee ? (
                                    <>
                                        <div className="flex items-center gap-4 group cursor-pointer hover:bg-zinc-900/50 p-2 -mx-2 rounded-xl transition-colors" onClick={() => router.push('/dashboard/holidays')}>
                                            <div className="h-10 w-10 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-lime font-medium group-hover:scale-110 transition-transform">
                                                <CheckCircle className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-white">Next Holiday</p>
                                                <p className="text-xs text-zinc-500">View Calendar</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 group cursor-pointer hover:bg-zinc-900/50 p-2 -mx-2 rounded-xl transition-colors" onClick={() => router.push('/dashboard/leaves')}>
                                            <div className="h-10 w-10 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-blue-400 font-medium group-hover:scale-110 transition-transform">
                                                <Calendar className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-white">Request Leave</p>
                                                <p className="text-xs text-zinc-500">Plan your time off</p>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col gap-3 h-full justify-between">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-4 group cursor-pointer hover:bg-zinc-900/50 p-2 -mx-2 rounded-xl transition-colors" onClick={() => router.push('/dashboard/leaves?status=PENDING')}>
                                                <div className="h-10 w-10 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-orange-400 font-medium group-hover:scale-110 transition-transform">
                                                    <AlertCircle className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-white">Pending Requests</p>
                                                    <p className="text-xs text-zinc-500">Review leave applications</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 group cursor-pointer hover:bg-zinc-900/50 p-2 -mx-2 rounded-xl transition-colors" onClick={() => router.push('/dashboard/employees')}>
                                                <div className="h-10 w-10 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-blue-400 font-medium group-hover:scale-110 transition-transform">
                                                    <Users className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-white">Manage Team</p>
                                                    <p className="text-xs text-zinc-500">View all employees</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-6 border-t border-white/5">
                                            <div className="flex items-center gap-4 group cursor-pointer hover:bg-zinc-900/50 p-2 -mx-2 rounded-xl transition-colors" onClick={() => router.push('/dashboard/reports')}>
                                                <div className="h-10 w-10 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-purple-400 font-medium group-hover:scale-110 transition-transform">
                                                    <TrendingUp className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-white">Generate Reports</p>
                                                    <p className="text-xs text-zinc-500">Weekly & Monthly analysis</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Main Dashboard Content */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Header for Panel */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-medium text-white">Dashboard Overview</h2>
                            <p className="text-sm text-zinc-500">Overview {'>'} All Reports</p>
                        </div>

                    </div>

                    {/* Employee View */}
                    {isEmployee && (
                        <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden group">
                            {/* Decorative Background */}
                            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-lime/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                            <div className="relative z-10">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                                    <div>
                                        <h3 className="text-3xl font-bold text-white mb-1 tabular-nums">
                                            {formatTime(liveTime)}
                                        </h3>
                                        <p className="text-zinc-500 font-medium">
                                            {liveTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {todayStatus?.attendance?.checkInTime && !todayStatus?.attendance?.checkOutTime && (
                                            <div className="px-4 py-2 rounded-full bg-lime/10 border border-lime/30 text-sm font-bold text-lime flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-lime animate-pulse" />
                                                Working
                                            </div>
                                        )}
                                        <div className="px-4 py-2 rounded-full bg-zinc-900 border border-white/10 text-xs font-bold text-zinc-400">
                                            {todayStatus?.shift?.name || 'Regular Shift'}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                    <div className="p-5 rounded-[1.5rem] bg-zinc-900/50 border border-white/5">
                                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Check In</p>
                                        <p className="text-2xl font-bold text-white tabular-nums">
                                            {todayStatus?.attendance?.checkInTime ? formatTime(todayStatus.attendance.checkInTime) : '--:--'}
                                        </p>
                                        {todayStatus?.attendance?.checkInTime && todayStatus?.employee?.shift && (() => {
                                            const status = getTimingStatus(todayStatus.attendance.checkInTime, todayStatus.employee.shift.startTime, 'start');
                                            if (!status) return null;
                                            return (
                                                <div className={`flex items-center gap-1.5 mt-2 text-[10px] uppercase font-extrabold tracking-wider ${status.color}`}>
                                                    <status.icon className="h-3 w-3" />
                                                    {status.label}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div className="p-5 rounded-[1.5rem] bg-zinc-900/50 border border-white/5">
                                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Check Out</p>
                                        <p className="text-2xl font-bold text-white tabular-nums">
                                            {todayStatus?.attendance?.checkOutTime ? formatTime(todayStatus.attendance.checkOutTime) : '--:--'}
                                        </p>
                                        {todayStatus?.attendance?.checkOutTime && todayStatus?.employee?.shift && (() => {
                                            const status = getTimingStatus(todayStatus.attendance.checkOutTime, todayStatus.employee.shift.endTime, 'end');
                                            if (!status) return null;
                                            return (
                                                <div className={`flex items-center gap-1.5 mt-2 text-[10px] uppercase font-extrabold tracking-wider ${status.color}`}>
                                                    <status.icon className="h-3 w-3" />
                                                    {status.label}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div className={cn(
                                        "p-5 rounded-[1.5rem] border",
                                        todayStatus?.attendance?.checkInTime && !todayStatus?.attendance?.checkOutTime
                                            ? "bg-lime/5 border-lime/20"
                                            : "bg-zinc-900/50 border-white/5"
                                    )}>
                                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">
                                            {todayStatus?.attendance?.checkInTime && !todayStatus?.attendance?.checkOutTime ? 'Time Elapsed' : 'Duration'}
                                        </p>
                                        <p className={cn(
                                            "text-2xl font-bold tabular-nums",
                                            todayStatus?.attendance?.checkInTime && !todayStatus?.attendance?.checkOutTime ? "text-lime" : "text-white"
                                        )}>
                                            {todayStatus?.attendance?.checkInTime && !todayStatus?.attendance?.checkOutTime ? (
                                                // Live timer when working
                                                <>{String(workingDuration.hours).padStart(2, '0')}:{String(workingDuration.minutes).padStart(2, '0')}:{String(workingDuration.seconds).padStart(2, '0')}</>
                                            ) : (
                                                // Static duration when checked out or not started
                                                <>{Math.floor((todayStatus?.attendance?.totalWorkMinutes || 0) / 60)}h {(todayStatus?.attendance?.totalWorkMinutes || 0) % 60}m</>
                                            )}
                                        </p>
                                    </div>
                                    <div className="p-5 rounded-[1.5rem] bg-zinc-900/50 border border-white/5">
                                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Status</p>
                                        <span className={cn(
                                            "inline-block px-3 py-1 rounded-lg text-sm font-bold",
                                            todayStatus?.attendance?.status === 'PRESENT' ? "bg-lime text-black" : "bg-zinc-800 text-zinc-400"
                                        )}>
                                            {todayStatus?.attendance?.status || 'PENDING'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    {!todayStatus?.attendance?.checkInTime ? (
                                        <button
                                            onClick={() => handleCheckIn()}
                                            disabled={checkingIn}
                                            className="w-full sm:w-auto bg-lime hover:bg-lime-400 text-black font-extrabold text-lg px-8 py-4 rounded-[1.5rem] transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(204,255,0,0.2)] hover:shadow-[0_0_50px_rgba(204,255,0,0.4)] disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
                                        >
                                            <PlayCircle className="h-6 w-6" />
                                            {checkingIn ? 'Clocking In...' : 'Start Your Day'}
                                        </button>
                                    ) : !todayStatus?.attendance?.checkOutTime ? (
                                        <button
                                            onClick={initiateCheckOut}
                                            disabled={checkingOut}
                                            className="w-full sm:w-auto bg-white hover:bg-zinc-200 text-black font-extrabold text-lg px-8 py-4 rounded-[1.5rem] transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
                                        >
                                            <PauseCircle className="h-6 w-6" />
                                            {checkingOut ? 'Clocking Out...' : 'Check Out'}
                                        </button>
                                    ) : (
                                        <div className="w-full sm:w-auto bg-zinc-900 text-zinc-400 font-bold text-lg px-8 py-4 rounded-[1.5rem] flex items-center justify-center gap-3 border border-white/5 min-w-[200px]">
                                            <CheckCircle className="h-6 w-6 text-lime" />
                                            Attendance Recorded
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {!isEmployee && (
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Asset Allocation / Stats Style Card */}
                            <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-between h-full min-h-[320px]">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-bold text-white">Daily Stats</h3>

                                </div>

                                <div className="flex-1 flex flex-col justify-between space-y-6">
                                    <div className="flex-1 flex flex-col justify-center">
                                        <div>
                                            <p className="text-4xl font-extrabold text-white tracking-tight">
                                                {dashboardStats?.today?.present || 0}
                                                <span className="text-xl text-zinc-500 font-medium ml-2">/ {dashboardStats?.today?.totalEmployees || 0}</span>
                                            </p>
                                            <p className="text-sm font-bold text-lime mt-1 flex items-center gap-2">
                                                <span className="h-2 w-2 rounded-full bg-lime" />
                                                Present Today
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-5 gap-2 mt-6">
                                            {Array.from({ length: 10 }).map((_, i) => {
                                                const total = dashboardStats?.today?.totalEmployees || 1;
                                                const late = dashboardStats?.today?.late || 0;
                                                const present = dashboardStats?.today?.present || 0; // Includes late
                                                const onTime = Math.max(0, present - late);
                                                const leave = dashboardStats?.today?.onLeave || 0;

                                                // Calculate cumulative thresholds (0-10 scale)
                                                // Order: OnTime -> Late -> Leave -> Absent
                                                const onTimeThreshold = (onTime / total) * 10;
                                                const lateThreshold = ((onTime + late) / total) * 10;
                                                const leaveThreshold = ((onTime + late + leave) / total) * 10;

                                                let barColor = "bg-zinc-800"; // Default (Absent)

                                                if (i < onTimeThreshold) barColor = "bg-lime";
                                                else if (i < lateThreshold) barColor = "bg-amber-400";
                                                else if (i < leaveThreshold) barColor = "bg-blue-400";

                                                return (
                                                    <div
                                                        key={i}
                                                        className={cn("h-3 rounded-full w-full transition-colors duration-500", barColor)}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end pt-4 border-t border-white/5">
                                        <div>
                                            <p className="text-zinc-500 text-xs font-bold uppercase">Absent</p>
                                            <p className="text-xl font-bold text-white">{dashboardStats?.today?.absent || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-zinc-500 text-xs font-bold uppercase">Late</p>
                                            <p className="text-xl font-bold text-white">{dashboardStats?.today?.late || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-zinc-500 text-xs font-bold uppercase">Leave</p>
                                            <p className="text-xl font-bold text-white">{dashboardStats?.today?.onLeave || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Chart Card */}
                            <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Activity</h3>
                                        <p className="text-sm text-zinc-500">Attendance Trends This Week</p>
                                    </div>
                                    {historyLoading && (
                                        <div className="h-5 w-5 border-2 border-lime border-t-transparent rounded-full animate-spin" />
                                    )}
                                </div>
                                <div className="h-[200px] w-full">
                                    {chartData.every(d => d.value === 0) ? (
                                        <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                                            <Calendar className="h-8 w-8 mb-2 opacity-30" />
                                            <p className="text-sm font-medium">No attendance data this week</p>
                                            <p className="text-xs text-zinc-600 mt-1">Check back when employees start checking in</p>
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={chartData}
                                                margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                                            >
                                                <defs>
                                                    <linearGradient id="limeBarGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#CCFF00" stopOpacity={1} />
                                                        <stop offset="100%" stopColor="#CCFF00" stopOpacity={0.6} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid vertical={false} stroke="#27272a" strokeDasharray="4 4" />
                                                <XAxis
                                                    dataKey="name"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#71717a', fontSize: 12, fontWeight: 500 }}
                                                    dy={10}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#18181b',
                                                        borderColor: '#27272a',
                                                        borderRadius: '12px',
                                                        color: '#fff',
                                                        fontSize: '12px',
                                                        fontWeight: 'bold',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                                    }}
                                                    cursor={{ fill: '#27272a', opacity: 0.4 }}
                                                    formatter={(value: number) => [`${value}`, 'Present']}
                                                />
                                                <Bar
                                                    dataKey="value"
                                                    fill="url(#limeBarGradient)"
                                                    radius={[6, 6, 6, 6]}
                                                    barSize={32}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bottom Promo / Feature Card */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                            <div className="absolute right-0 top-0 w-32 h-32 bg-lime/20 blur-[60px] rounded-full" />

                            <div className="relative z-10 flex flex-col items-start gap-4">
                                <span className="px-4 py-1.5 rounded-full bg-white/10 border border-white/5 text-xs font-bold text-white">
                                    +15% efficiency
                                </span>
                                <h3 className="text-2xl font-bold text-white leading-tight">
                                    Generate Detailed<br />
                                    Attendance Reports
                                </h3>
                                <button
                                    onClick={() => window.location.href = '/dashboard/reports'}
                                    className="mt-4 bg-lime hover:bg-lime-400 text-black px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 group-hover:translate-x-1"
                                >
                                    View Reports <ArrowUpRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8 flex items-center justify-between group cursor-pointer hover:border-lime/30 transition-all">
                            <div>
                                <div className="h-12 w-12 rounded-full bg-lime/10 flex items-center justify-center mb-4 text-lime">
                                    <Users className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white">Team Directory</h3>
                                <p className="text-zinc-500 text-sm mt-1">Manage employees & roles</p>
                            </div>
                            <div className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-lime group-hover:text-black group-hover:border-lime transition-all">
                                <ArrowUpRight className="h-5 w-5" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity / Logs Section to fill bottom space */}
            <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-bold text-white">Recent Activity</h3>
                        <p className="text-sm text-zinc-500 mt-1">Latest attendance logs across the organization</p>
                    </div>
                    <button onClick={() => router.push('/dashboard/reports')} className="text-sm font-bold text-lime hover:opacity-80 transition-opacity flex items-center gap-2">
                        View All History <ArrowUpRight className="h-4 w-4" />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5 text-left">
                                <th className="pb-5 pl-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Employee</th>
                                <th className="pb-5 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                                <th className="pb-5 text-xs font-bold text-zinc-500 uppercase tracking-wider">Time In</th>
                                <th className="pb-5 text-xs font-bold text-zinc-500 uppercase tracking-wider">Time Out</th>
                                <th className="pb-5 text-right pr-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {historyLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-4 pl-4"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-zinc-900" /><div className="h-4 w-24 bg-zinc-900 rounded" /></div></td>
                                        <td className="py-4"><div className="h-6 w-20 bg-zinc-900 rounded-full" /></td>
                                        <td className="py-4"><div className="h-4 w-16 bg-zinc-900 rounded" /></td>
                                        <td className="py-4"><div className="h-4 w-16 bg-zinc-900 rounded" /></td>
                                        <td className="py-4 pr-4"><div className="h-4 w-20 bg-zinc-900 rounded ml-auto" /></td>
                                    </tr>
                                ))
                            ) : historyError ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-sm text-red-400">
                                        Failed to load activity data. Please try again.
                                    </td>
                                </tr>
                            ) : !historyData?.items?.length ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-sm text-zinc-500">
                                        No recent activity records found.
                                    </td>
                                </tr>
                            ) : (
                                historyData.items.slice(0, 5).map((record: any, i: number) => (
                                    <tr key={i} className="group hover:bg-white/5 transition-colors">
                                        <td className="py-4 pl-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                                                    {record.employee?.firstName?.[0] || 'U'}
                                                </div>
                                                <span className="text-sm font-medium text-white">
                                                    {record.employee?.firstName || 'User'} {record.employee?.lastName || ''}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-xs font-bold border",
                                                record.status === 'PRESENT' ? "bg-lime/10 text-lime border-lime/20" :
                                                    record.status === 'ABSENT' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                                        record.status === 'HALF_DAY' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                                                            "bg-zinc-800 text-zinc-400 border-zinc-700"
                                            )}>
                                                {record.status}
                                            </span>
                                        </td>
                                        <td className="py-4 text-sm text-zinc-400 font-mono">{formatTime(record.checkInTime) || '--:--'}</td>
                                        <td className="py-4 text-sm text-zinc-400 font-mono">{formatTime(record.checkOutTime) || '--:--'}</td>
                                        <td className="py-4 pr-4 text-sm text-zinc-500 text-right">{format(new Date(record.date), 'MMM do')}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Checkout Confirmation Modal */}
            {
                showCheckoutConfirmation && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-[#111111] border border-white/10 p-8 rounded-[2rem] max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] space-y-6 transform animate-in zoom-in-95 duration-200">
                            <div className="space-y-4 text-center">
                                <div className="mx-auto h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
                                    <PauseCircle className="h-8 w-8 text-red-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-white">Confirm Check Out?</h3>
                                <p className="text-zinc-400 text-lg leading-relaxed">
                                    Are you sure you want to end your shift? <br />
                                    <span className="text-red-400 font-medium">You cannot check in again today.</span>
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <button
                                    onClick={() => setShowCheckoutConfirmation(false)}
                                    className="px-6 py-4 rounded-xl bg-zinc-900 border border-white/5 text-white font-bold hover:bg-zinc-800 transition-colors"
                                >
                                    No, Cancel
                                </button>
                                <button
                                    onClick={performCheckOut}
                                    className="px-6 py-4 rounded-xl bg-lime text-black font-bold hover:bg-lime-400 transition-all shadow-[0_0_20px_rgba(204,255,0,0.2)] hover:shadow-[0_0_30px_rgba(204,255,0,0.4)]"
                                >
                                    Yes, Check Out
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
