'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/stores/auth-store';
import { authApi } from '@/lib/api/auth';

const loginSchema = z.object({
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [requires2FA, setRequires2FA] = useState(false);
    const [tempToken, setTempToken] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const setAuth = useAuthStore((state) => state.setAuth);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginForm) => {
        setIsLoading(true);
        try {
            const response = await authApi.login(data.email, data.password);

            if (response.requires2FA) {
                setRequires2FA(true);
                setTempToken(response.tempToken || '');
                toast.info('Please enter your 2FA code');
            } else {
                setAuth(response.user, response.accessToken);
                toast.success('Welcome back!');
                router.push('/dashboard');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handle2FASubmit = async () => {
        if (twoFactorCode.length !== 6) {
            toast.error('Please enter a 6-digit code');
            return;
        }

        setIsLoading(true);
        try {
            const response = await authApi.verify2FA(tempToken, twoFactorCode);
            setAuth(response.user, response.accessToken);
            toast.success('Welcome back!');
            router.push('/dashboard');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Invalid 2FA code');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-[#050505] p-4 lg:p-6 gap-6 overflow-hidden">
            {/* Left side - Form Section */}
            <div className="flex-1 flex flex-col relative bg-transparent rounded-3xl">
                {/* Logo - Fixed to Top Left */}
                <div className="absolute top-4 left-4 lg:top-8 lg:left-8">
                    <Link href="/" className="flex items-center gap-3 w-fit group">
                        <div className="h-11 w-11 rounded-xl bg-lime flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-[0_4px_20px_rgba(204,255,0,0.2)]">
                            <Clock className="h-6 w-6 text-black" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-bold text-white tracking-tight leading-none">ATTENDIFY<span className="text-lime">.</span></span>
                            <span className="text-[10px] font-medium text-zinc-500 tracking-[0.2em] uppercase">Management</span>
                        </div>
                    </Link>
                </div>

                {/* Main Form Content - Perfectly Centered */}
                <div className="flex-1 flex flex-col justify-center items-center w-full px-4 sm:px-12 lg:px-20">
                    <div className="w-full max-w-[440px] space-y-8">
                        {/* Header Text - Centered */}
                        <div className="text-center space-y-3">
                            <h1 className="text-4xl font-bold text-white tracking-tight">Welcome Back</h1>
                            <p className="text-zinc-400 text-lg">
                                Enter your email and password to access your account.
                            </p>
                        </div>

                        {!requires2FA ? (
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-zinc-300 ml-1">Email</label>
                                        <input
                                            type="email"
                                            {...register('email')}
                                            className="w-full px-5 py-4 rounded-xl bg-zinc-900/50 border border-zinc-800 focus:border-lime focus:ring-1 focus:ring-lime transition-all outline-none text-white placeholder:text-zinc-600 focus:bg-zinc-900"
                                            placeholder="name@company.com"
                                        />
                                        {errors.email && (
                                            <p className="text-red-500 text-sm font-medium ml-1 mt-1">{errors.email.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-zinc-300 ml-1">Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                {...register('password')}
                                                className="w-full px-5 py-4 rounded-xl bg-zinc-900/50 border border-zinc-800 focus:border-lime focus:ring-1 focus:ring-lime transition-all outline-none text-white placeholder:text-zinc-600 focus:bg-zinc-900 pr-12"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                        {errors.password && (
                                            <p className="text-red-500 text-sm font-medium ml-1 mt-1">{errors.password.message}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between px-1">
                                    <label className="flex items-center gap-2.5 text-sm text-zinc-400 cursor-pointer group select-none">
                                        <div className="relative flex items-center">
                                            <input type="checkbox" className="peer sr-only" />
                                            <div className="w-5 h-5 rounded border-2 border-zinc-700 bg-zinc-900 peer-checked:bg-lime peer-checked:border-lime transition-all"></div>
                                            <svg className="absolute w-3 h-3 text-black opacity-0 peer-checked:opacity-100 left-1 top-1 transition-opacity pointer-events-none" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <span className="group-hover:text-white transition-colors">Remember Me</span>
                                    </label>
                                    <Link href="/auth/forgot-password" className="text-sm font-bold text-lime hover:text-lime-400 hover:underline transition-all">
                                        Forgot Password?
                                    </Link>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-4 rounded-xl bg-lime hover:bg-lime-400 text-black font-bold text-lg shadow-[0_4px_20px_rgba(204,255,0,0.25)] hover:shadow-[0_4px_25px_rgba(204,255,0,0.4)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center tracking-wide"
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    ) : (
                                        'Log In'
                                    )}
                                </button>

                                <div className="space-y-6 pt-2">
                                    <p className="text-center text-zinc-500 font-medium pt-4">
                                        Don't have an account?{' '}
                                        <Link href="/auth/register" className="text-lime hover:underline font-bold hover:text-lime-400 transition-colors">
                                            Register Now
                                        </Link>
                                    </p>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-zinc-300 ml-1">2FA Code</label>
                                    <input
                                        type="text"
                                        value={twoFactorCode}
                                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="w-full px-5 py-4 rounded-xl bg-zinc-900/50 border border-white/10 focus:border-lime focus:ring-1 focus:ring-lime text-center text-3xl font-mono tracking-[0.5em] text-white placeholder:text-zinc-700 transition-all outline-none"
                                        placeholder="000000"
                                        maxLength={6}
                                    />
                                </div>
                                <button
                                    onClick={handle2FASubmit}
                                    disabled={isLoading}
                                    className="w-full py-4 rounded-xl bg-lime hover:bg-lime-400 text-black font-bold text-lg shadow-[0_4px_20px_rgba(204,255,0,0.2)] hover:shadow-[0_4px_25px_rgba(204,255,0,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    ) : (
                                        'Verify'
                                    )}
                                </button>
                                <button
                                    onClick={() => setRequires2FA(false)}
                                    className="w-full py-2 text-sm text-zinc-500 hover:text-white transition-colors font-medium"
                                >
                                    Back to login
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer - Fixed to Bottom */}
                <div className="absolute bottom-4 left-0 w-full px-8 text-center sm:text-left sm:flex sm:justify-between sm:items-center text-xs text-zinc-500">
                    <p>Copyright © 2026 Attendify Inc.</p>
                    <div className="hidden sm:flex gap-6">
                        <Link href="/privacy" className="text-white hover:text-lime transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="text-white hover:text-lime transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </div>

            {/* Right side - Showcase */}
            <div className="hidden lg:flex flex-1 bg-[#0F0F0F] rounded-[2.5rem] relative overflow-hidden flex-col p-20 border border-white/[0.02]">
                {/* Background Gradients */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-lime/10 rounded-full blur-[140px] -mr-32 -mt-32 pointer-events-none opacity-60" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-lime/5 rounded-full blur-[120px] -ml-20 -mb-20 pointer-events-none opacity-40" />

                <div className="z-20 max-w-2xl mt-12">
                    <h2 className="text-[3.5rem] font-bold text-white mb-8 leading-[1.05] tracking-tight">
                        Effortlessly manage your <span className="text-lime">team</span> and operations.
                    </h2>
                    <p className="text-xl text-zinc-400 leading-relaxed max-w-lg font-medium">
                        Log in to access your dashboard, track attendance in real-time, and manage your workforce efficiently.
                    </p>
                </div>

                {/* Dashboard Image Preview */}
                <div className="relative w-full mt-10 z-10 translate-y-12">
                    <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-black/80 ring-1 ring-white/10 group transform hover:scale-[1.01] transition-transform duration-700 ease-out">
                        <div className="absolute inset-0 bg-transparent group-hover:bg-transparent transition-colors duration-500 z-20 pointer-events-none" />
                        <Image
                            src="/dashboard-preview.png"
                            alt="Dashboard Preview"
                            width={1400}
                            height={900}
                            quality={100}
                            className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-700"
                            priority
                            unoptimized
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
