'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clock, Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api/auth';

const forgotPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isEmailSent, setIsEmailSent] = useState(false);
    const [submittedEmail, setSubmittedEmail] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordForm>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordForm) => {
        setIsLoading(true);
        try {
            await authApi.forgotPassword(data.email);
            setSubmittedEmail(data.email);
            setIsEmailSent(true);
            toast.success('Password reset email sent!');
        } catch (error: any) {
            // Still show success to prevent email enumeration
            setSubmittedEmail(data.email);
            setIsEmailSent(true);
            toast.success('If an account exists with this email, you will receive a password reset link.');
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
                        {!isEmailSent ? (
                            <>
                                {/* Header Text */}
                                <div className="space-y-3">
                                    <h1 className="text-4xl font-bold text-white tracking-tight">Forgot Password?</h1>
                                    <p className="text-zinc-400 text-lg">
                                        No worries! Enter your email and we'll send you a reset link.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-zinc-300 ml-1">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                                            <input
                                                type="email"
                                                {...register('email')}
                                                className="w-full pl-14 pr-5 py-4 rounded-xl bg-zinc-900/50 border border-zinc-800 focus:border-lime focus:ring-1 focus:ring-lime transition-all outline-none text-white placeholder:text-zinc-600 focus:bg-zinc-900"
                                                placeholder="Enter your email"
                                            />
                                        </div>
                                        {errors.email && (
                                            <p className="text-red-500 text-sm font-medium ml-1 mt-1">{errors.email.message}</p>
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
                                            'Send Reset Link'
                                        )}
                                    </button>
                                </form>

                                <div className="pt-4">
                                    <Link
                                        href="/auth/login"
                                        className="flex items-center justify-center gap-2 text-zinc-400 hover:text-white transition-colors font-medium"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back to Login
                                    </Link>
                                </div>
                            </>
                        ) : (
                            /* Success State */
                            <div className="text-center space-y-6">
                                <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-lime/20 mx-auto">
                                    <CheckCircle className="h-10 w-10 text-lime" />
                                </div>
                                <div className="space-y-3">
                                    <h1 className="text-3xl font-bold text-white tracking-tight">Check Your Email</h1>
                                    <p className="text-zinc-400 text-lg">
                                        We've sent a password reset link to:
                                    </p>
                                    <p className="text-white font-semibold text-lg">{submittedEmail}</p>
                                </div>
                                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-left">
                                    <p className="text-zinc-400 text-sm">
                                        Didn't receive the email? Check your spam folder, or{' '}
                                        <button
                                            onClick={() => setIsEmailSent(false)}
                                            className="text-lime hover:underline font-medium"
                                        >
                                            try another email address
                                        </button>
                                    </p>
                                </div>
                                <div className="pt-4">
                                    <Link
                                        href="/auth/login"
                                        className="flex items-center justify-center gap-2 text-zinc-400 hover:text-white transition-colors font-medium"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back to Login
                                    </Link>
                                </div>
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

            {/* Right side - Illustration */}
            <div className="hidden lg:flex flex-1 bg-[#0F0F0F] rounded-[2.5rem] relative overflow-hidden flex-col justify-center items-center p-20 border border-white/[0.02]">
                {/* Background Gradients */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-lime/10 rounded-full blur-[140px] -mr-32 -mt-32 pointer-events-none opacity-60" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-lime/5 rounded-full blur-[120px] -ml-20 -mb-20 pointer-events-none opacity-40" />

                <div className="z-20 text-center max-w-md">
                    <div className="inline-flex items-center justify-center h-32 w-32 rounded-full bg-lime/10 mb-8">
                        <Mail className="h-16 w-16 text-lime" />
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
                        Reset Your <span className="text-lime">Password</span>
                    </h2>
                    <p className="text-xl text-zinc-400 leading-relaxed">
                        We'll help you get back into your account quickly and securely.
                    </p>
                </div>
            </div>
        </div>
    );
}
