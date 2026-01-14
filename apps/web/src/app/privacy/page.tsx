'use client';

import Link from 'next/link';
import { Clock, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-[#050505] text-white">
            {/* Header */}
            <header className="border-b border-zinc-800/50">
                <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="h-11 w-11 rounded-xl bg-lime flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-[0_4px_20px_rgba(204,255,0,0.2)]">
                            <Clock className="h-6 w-6 text-black" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-bold text-white tracking-tight leading-none">ATTENDIFY<span className="text-lime">.</span></span>
                            <span className="text-[10px] font-medium text-zinc-500 tracking-[0.2em] uppercase">Management</span>
                        </div>
                    </Link>
                    <Link
                        href="/auth/login"
                        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors font-medium"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Login
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-16">
                <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
                <p className="text-zinc-500 mb-12">Last updated: January 12, 2026</p>

                <div className="space-y-10 text-zinc-300 leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
                        <p>
                            Welcome to Attendify ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our attendance management platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
                        <p className="mb-4">We collect information that you provide directly to us, including:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Account information (name, email address, password)</li>
                            <li>Company information (company name, size, industry)</li>
                            <li>Employee data (names, departments, work schedules)</li>
                            <li>Attendance records (clock-in/out times, locations)</li>
                            <li>Device information (IP address, browser type, device identifiers)</li>
                            <li>Location data (when GPS tracking is enabled)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
                        <p className="mb-4">We use the collected information to:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Provide and maintain our attendance management services</li>
                            <li>Process and track employee attendance</li>
                            <li>Generate reports and analytics</li>
                            <li>Send notifications and alerts</li>
                            <li>Improve our platform and develop new features</li>
                            <li>Ensure security and prevent fraud</li>
                            <li>Comply with legal obligations</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">4. Data Security</h2>
                        <p>
                            We implement industry-standard security measures to protect your data, including encryption, secure data transmission (SSL/TLS), access controls, and regular security audits. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">5. Data Retention</h2>
                        <p>
                            We retain your personal information for as long as your account is active or as needed to provide our services. Attendance records are retained according to your subscription plan and applicable legal requirements. You may request deletion of your data at any time.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">6. Your Rights</h2>
                        <p className="mb-4">Depending on your location, you may have the following rights:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Access and receive a copy of your personal data</li>
                            <li>Correct inaccurate or incomplete data</li>
                            <li>Request deletion of your personal data</li>
                            <li>Object to or restrict processing of your data</li>
                            <li>Data portability</li>
                            <li>Withdraw consent at any time</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">7. Third-Party Services</h2>
                        <p>
                            We may use third-party services for analytics, payment processing, and cloud hosting. These providers are contractually obligated to protect your information and use it only for the purposes we specify.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">8. Cookies and Tracking</h2>
                        <p>
                            We use cookies and similar tracking technologies to improve your experience, analyze usage patterns, and personalize content. You can control cookie preferences through your browser settings.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">9. Changes to This Policy</h2>
                        <p>
                            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">10. Contact Us</h2>
                        <p>
                            If you have any questions about this Privacy Policy or our data practices, please contact us at:
                        </p>
                        <div className="mt-4 p-6 bg-zinc-900/50 rounded-xl border border-zinc-800">
                            <p className="font-bold text-white">Attendify Inc.</p>
                            <p className="text-zinc-400 mt-2">Email: privacy@attendify.com</p>
                            <p className="text-zinc-400">Address: 123 Business Avenue, Suite 400, San Francisco, CA 94102</p>
                        </div>
                    </section>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-zinc-800/50 mt-16">
                <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row justify-between items-center text-sm text-zinc-500">
                    <p>Copyright © 2026 Attendify Inc.</p>
                    <div className="flex gap-6 mt-4 sm:mt-0">
                        <Link href="/privacy" className="text-lime hover:underline">Privacy Policy</Link>
                        <Link href="/terms" className="text-white hover:text-lime transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
