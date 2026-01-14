'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Shield, Loader2, CheckCircle, XCircle, Smartphone, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api/auth';
import api from '@/lib/api/client';

export default function SecuritySettings() {
    const queryClient = useQueryClient();

    // Password form state
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });

    // 2FA state
    const [show2FASetup, setShow2FASetup] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [disableCode, setDisableCode] = useState('');
    const [showDisable2FA, setShowDisable2FA] = useState(false);
    const [copied, setCopied] = useState(false);

    // Fetch 2FA status
    const { data: twoFAStatus } = useQuery({
        queryKey: ['2fa-status'],
        queryFn: async () => {
            const response = await api.get('/auth/2fa/status');
            return response.data.data;
        },
    });

    // Change password mutation
    const changePasswordMutation = useMutation({
        mutationFn: () => authApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword),
        onSuccess: () => {
            toast.success('Password changed successfully!');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to change password');
        },
    });

    // Enable 2FA mutation
    const enable2FAMutation = useMutation({
        mutationFn: () => authApi.enable2FA(),
        onSuccess: () => {
            setShow2FASetup(true);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to enable 2FA');
        },
    });

    // Confirm 2FA mutation
    const confirm2FAMutation = useMutation({
        mutationFn: (code: string) => authApi.confirm2FA(code),
        onSuccess: () => {
            toast.success('Two-factor authentication enabled!');
            setShow2FASetup(false);
            setVerificationCode('');
            queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Invalid verification code');
        },
    });

    // Disable 2FA mutation
    const disable2FAMutation = useMutation({
        mutationFn: (code: string) => authApi.disable2FA(code),
        onSuccess: () => {
            toast.success('Two-factor authentication disabled');
            setShowDisable2FA(false);
            setDisableCode('');
            queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Invalid verification code');
        },
    });

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            toast.error('Please fill in all password fields');
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        if (passwordForm.newPassword.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        changePasswordMutation.mutate();
    };

    const passwordStrength = () => {
        const password = passwordForm.newPassword;
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        return strength;
    };

    const copySecret = () => {
        if (enable2FAMutation.data?.secret) {
            navigator.clipboard.writeText(enable2FAMutation.data.secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success('Secret copied to clipboard');
        }
    };

    return (
        <div className="space-y-8">
            <h2 className="text-xl font-bold text-white">Security Settings</h2>

            {/* Change Password */}
            <form onSubmit={handlePasswordSubmit} className="space-y-6 pb-8 border-b border-white/5">
                <h3 className="font-bold text-white text-lg">Change Password</h3>
                <div className="grid gap-5 max-w-md">
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">
                            Current Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.current ? 'text' : 'password'}
                                value={passwordForm.currentPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                className="w-full px-4 py-3 pr-12 rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all"
                                placeholder="Enter current password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                            >
                                {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.new ? 'text' : 'password'}
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                className="w-full px-4 py-3 pr-12 rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all"
                                placeholder="Enter new password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                            >
                                {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                        {/* Password strength indicator */}
                        {passwordForm.newPassword && (
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
                        )}
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.confirm ? 'text' : 'password'}
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                className="w-full px-4 py-3 pr-12 rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all"
                                placeholder="Confirm new password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                            >
                                {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                        {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                            <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                                <XCircle className="h-4 w-4" /> Passwords do not match
                            </p>
                        )}
                        {passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword && passwordForm.newPassword.length > 0 && (
                            <p className="text-lime text-sm mt-2 flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" /> Passwords match
                            </p>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={changePasswordMutation.isPending || !passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
                        className="bg-lime hover:bg-lime-400 text-black px-8 py-3 rounded-full font-bold transition-all hover:scale-105 w-fit disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {changePasswordMutation.isPending ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            'Update Password'
                        )}
                    </button>
                </div>
            </form>

            {/* Two-Factor Authentication */}
            <div className="space-y-4">
                <h3 className="font-bold text-white text-lg">Two-Factor Authentication</h3>

                {twoFAStatus?.enabled ? (
                    // 2FA is enabled
                    <div className="p-6 bg-lime/10 rounded-xl border border-lime/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-lime/20 flex items-center justify-center">
                                    <Shield className="h-6 w-6 text-lime" />
                                </div>
                                <div>
                                    <p className="font-bold text-white mb-1 flex items-center gap-2">
                                        Two-Factor Authentication
                                        <span className="px-2 py-0.5 text-xs font-bold bg-lime/20 text-lime rounded">ENABLED</span>
                                    </p>
                                    <p className="text-sm text-zinc-400 font-medium">
                                        Your account is protected with an authenticator app
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDisable2FA(true)}
                                className="px-6 py-2 rounded-full border border-red-500/30 hover:bg-red-500/10 text-red-500 font-bold text-sm transition-colors"
                            >
                                Disable
                            </button>
                        </div>

                        {/* Disable 2FA Form */}
                        {showDisable2FA && (
                            <div className="mt-6 pt-6 border-t border-lime/20">
                                <p className="text-sm text-zinc-400 mb-4">
                                    Enter your authenticator code to disable two-factor authentication:
                                </p>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={disableCode}
                                        onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="Enter 6-digit code"
                                        className="flex-1 max-w-xs px-4 py-3 rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all text-center text-lg tracking-widest font-mono"
                                    />
                                    <button
                                        onClick={() => disable2FAMutation.mutate(disableCode)}
                                        disabled={disableCode.length !== 6 || disable2FAMutation.isPending}
                                        className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {disable2FAMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm Disable'}
                                    </button>
                                    <button
                                        onClick={() => { setShowDisable2FA(false); setDisableCode(''); }}
                                        className="px-6 py-3 rounded-xl hover:bg-zinc-800 text-white font-bold transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : show2FASetup ? (
                    // 2FA Setup Flow
                    <div className="p-6 bg-zinc-900/50 rounded-xl border border-lime/30">
                        <h4 className="font-bold text-white text-lg mb-4">Set Up Authenticator App</h4>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* QR Code */}
                            <div className="space-y-4">
                                <p className="text-sm text-zinc-400">
                                    1. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                                </p>
                                {enable2FAMutation.data?.qrCode && (
                                    <div className="bg-white p-4 rounded-xl w-fit">
                                        <img
                                            src={enable2FAMutation.data.qrCode}
                                            alt="2FA QR Code"
                                            className="w-48 h-48"
                                        />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <p className="text-xs text-zinc-500">Or enter this secret manually:</p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 px-3 py-2 bg-black rounded-lg text-lime text-sm font-mono break-all">
                                            {enable2FAMutation.data?.secret}
                                        </code>
                                        <button
                                            onClick={copySecret}
                                            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                                        >
                                            {copied ? <Check className="h-5 w-5 text-lime" /> : <Copy className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Verification */}
                            <div className="space-y-4">
                                <p className="text-sm text-zinc-400">
                                    2. Enter the 6-digit code from your authenticator app to verify setup
                                </p>
                                <input
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    className="w-full px-4 py-4 rounded-xl border border-white/10 bg-zinc-900 text-white focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all text-center text-2xl tracking-[0.5em] font-mono"
                                    maxLength={6}
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => confirm2FAMutation.mutate(verificationCode)}
                                        disabled={verificationCode.length !== 6 || confirm2FAMutation.isPending}
                                        className="flex-1 bg-lime hover:bg-lime-400 text-black px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {confirm2FAMutation.isPending ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                Verifying...
                                            </>
                                        ) : (
                                            'Verify & Enable'
                                        )}
                                    </button>
                                    <button
                                        onClick={() => { setShow2FASetup(false); setVerificationCode(''); }}
                                        className="px-6 py-3 rounded-xl hover:bg-zinc-800 text-white font-bold transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // 2FA not enabled
                    <div className="flex items-center justify-between p-6 bg-zinc-900/50 rounded-xl border border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center">
                                <Smartphone className="h-6 w-6 text-zinc-500" />
                            </div>
                            <div>
                                <p className="font-bold text-white mb-1">Authenticator App</p>
                                <p className="text-sm text-zinc-500 font-medium">
                                    Use an authenticator app to generate one-time codes
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => enable2FAMutation.mutate()}
                            disabled={enable2FAMutation.isPending}
                            className="px-6 py-2 rounded-full border border-white/10 hover:bg-zinc-800 text-white font-bold text-sm transition-colors flex items-center gap-2"
                        >
                            {enable2FAMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Setting up...
                                </>
                            ) : (
                                'Enable'
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
