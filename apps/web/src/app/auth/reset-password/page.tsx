'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clock, Loader2, Eye, EyeOff, CheckCircle, XCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api/auth';

const resetPasswordSchema = z.object({
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain an uppercase letter')
        .regex(/[a-z]/, 'Password must contain a lowercase letter')
        .regex(/[0-9]/, 'Password must contain a number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain a special character'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isInvalidToken, setIsInvalidToken] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
    } = useForm<ResetPasswordForm>({
        resolver: zodResolver(resetPasswordSchema),
    });

    const password = watch('password', '');

    const passwordStrength = () => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        return strength;
    };

    useEffect(() => {
        if (!token) {
            setIsInvalidToken(true);
        }
    }, [token]);

    const onSubmit = async (data: ResetPasswordForm) => {
        if (!token) {
            toast.error('Invalid reset token');
            return;
        }

        setIsLoading(true);
        try {
            await authApi.resetPassword(token, data.password);
            setIsSuccess(true);
            toast.success('Password reset successfully!');
            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push('/auth/login');
            }, 3000);
        } catch (error: any) {
            if (error.response?.status === 400 || error.response?.status === 404) {
                setIsInvalidToken(true);
                toast.error('This reset link has expired or is invalid');
            } else {
                toast.error(error.response?.data?.message || 'Failed to reset password');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen w-full flex bg-[#050505] p-4 lg:p-6 gap-6 overflow-hidden">
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
                        {isInvalidToken ? (
                            /* Invalid Token State */
                            <div className="text-center space-y-6">
                                <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-red-500/20 mx-auto">
                                    <XCircle className="h-10 w-10 text-red-500" />
                                </div>
                                <div className="space-y-3">
                                    <h1 className="text-3xl font-bold text-white tracking-tight">Link Expired</h1>
                                    <p className="text-zinc-400 text-lg">
                                        This password reset link has expired or is invalid.
                                    </p>
                                </div>
                                <Link
                                    href="/auth/forgot-password"
                                    className="inline-block w-full py-4 rounded-xl bg-lime hover:bg-lime-400 text-black font-bold text-lg shadow-[0_4px_20px_rgba(204,255,0,0.25)] hover:shadow-[0_4px_25px_rgba(204,255,0,0.4)] hover:scale-[1.01] active:scale-[0.99] transition-all text-center"
                                >
                                    Request New Link
                                </Link>
                                <div className="pt-2">
                                    <Link
                                        href="/auth/login"
                                        className="text-zinc-400 hover:text-white transition-colors font-medium"
                                    >
                                        Back to Login
                                    </Link>
                                </div>
                            </div>
                        ) : isSuccess ? (
                            /* Success State */
                            <div className="text-center space-y-6">
                                <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-lime/20 mx-auto">
                                    <CheckCircle className="h-10 w-10 text-lime" />
                                </div>
                                <div className="space-y-3">
                                    <h1 className="text-3xl font-bold text-white tracking-tight">Password Reset!</h1>
                                    <p className="text-zinc-400 text-lg">
                                        Your password has been reset successfully. Redirecting you to login...
                                    </p>
                                </div>
                                <div className="flex justify-center">
                                    <Loader2 className="h-6 w-6 text-lime animate-spin" />
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Header Text */}
                                <div className="space-y-3">
                                    <h1 className="text-4xl font-bold text-white tracking-tight">Set New Password</h1>
                                    <p className="text-zinc-400 text-lg">
                                        Create a strong password for your account.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-zinc-300 ml-1">New Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                {...register('password')}
                                                className="w-full pl-14 pr-14 py-4 rounded-xl bg-zinc-900/50 border border-zinc-800 focus:border-lime focus:ring-1 focus:ring-lime transition-all outline-none text-white placeholder:text-zinc-600 focus:bg-zinc-900"
                                                placeholder="Enter new password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                        {/* Password strength indicator */}
                                        <div className="flex gap-1 mt-2">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <div
                                                    key={i}
                                                    className={`h-1.5 flex-1 rounded-full transition-colors ${i <= passwordStrength()
                                                        ? passwordStrength() <= 2
                                                            ? 'bg-red-500'
                                                            : passwordStrength() <= 3
                                                                ? 'bg-yellow-500'
                                                                : 'bg-lime'
                                                        : 'bg-zinc-800'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        {errors.password && (
                                            <p className="text-red-500 text-sm font-medium ml-1 mt-1">{errors.password.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-zinc-300 ml-1">Confirm Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                {...register('confirmPassword')}
                                                className="w-full pl-14 pr-14 py-4 rounded-xl bg-zinc-900/50 border border-zinc-800 focus:border-lime focus:ring-1 focus:ring-lime transition-all outline-none text-white placeholder:text-zinc-600 focus:bg-zinc-900"
                                                placeholder="Confirm new password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                        {errors.confirmPassword && (
                                            <p className="text-red-500 text-sm font-medium ml-1 mt-1">{errors.confirmPassword.message}</p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-4 rounded-xl bg-lime hover:bg-lime-400 text-black font-bold text-lg shadow-[0_4px_20px_rgba(204,255,0,0.25)] hover:shadow-[0_4px_25px_rgba(204,255,0,0.4)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center tracking-wide"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                        ) : (
                                            'Reset Password'
                                        )}
                                    </button>
                                </form>

                                <div className="pt-4">
                                    <Link
                                        href="/auth/login"
                                        className="flex items-center justify-center gap-2 text-zinc-400 hover:text-white transition-colors font-medium"
                                    >
                                        Back to Login
                                    </Link>
                                </div>
                            </>
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

            {/* Right side - Illustration */}
            <div className="hidden lg:flex flex-1 bg-[#0F0F0F] rounded-[2.5rem] relative overflow-hidden flex-col justify-center items-center p-20 border border-white/[0.02]">
                {/* Background Gradients */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-lime/10 rounded-full blur-[140px] -mr-32 -mt-32 pointer-events-none opacity-60" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-lime/5 rounded-full blur-[120px] -ml-20 -mb-20 pointer-events-none opacity-40" />

                <div className="z-20 text-center max-w-md">
                    <div className="inline-flex items-center justify-center h-32 w-32 rounded-full bg-lime/10 mb-8">
                        <Lock className="h-16 w-16 text-lime" />
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
                        Secure Your <span className="text-lime">Account</span>
                    </h2>
                    <p className="text-xl text-zinc-400 leading-relaxed">
                        Create a strong password to keep your account safe and protected.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="h-screen w-full flex items-center justify-center bg-[#050505]">
                <Loader2 className="h-8 w-8 text-lime animate-spin" />
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
