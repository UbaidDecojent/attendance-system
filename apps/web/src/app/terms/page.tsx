'use client';

import Link from 'next/link';
import { Clock, ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
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
                <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
                <p className="text-zinc-500 mb-12">Last updated: January 12, 2026</p>

                <div className="space-y-10 text-zinc-300 leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
                        <p>
                            By accessing or using Attendify's attendance management platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service. These Terms apply to all users, including administrators, managers, and employees.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
                        <p>
                            Attendify provides a cloud-based attendance management platform that enables organizations to track employee attendance, manage leaves, generate reports, and streamline workforce management. The Service includes web and mobile applications, APIs, and related support services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">3. Account Registration</h2>
                        <p className="mb-4">To use our Service, you must:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Provide accurate and complete registration information</li>
                            <li>Maintain the security of your account credentials</li>
                            <li>Promptly update any changes to your information</li>
                            <li>Accept responsibility for all activities under your account</li>
                            <li>Be at least 18 years old or have legal authority to bind your organization</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">4. Subscription and Billing</h2>
                        <p className="mb-4">Our Service is offered on a subscription basis:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Subscriptions are billed monthly or annually as selected</li>
                            <li>Prices are subject to change with 30 days' notice</li>
                            <li>Refunds are provided according to our refund policy</li>
                            <li>Failure to pay may result in service suspension</li>
                            <li>Free trials automatically convert to paid subscriptions unless cancelled</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">5. Acceptable Use</h2>
                        <p className="mb-4">You agree not to:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Use the Service for any illegal purposes</li>
                            <li>Attempt to gain unauthorized access to our systems</li>
                            <li>Interfere with or disrupt the Service</li>
                            <li>Upload malicious code or content</li>
                            <li>Violate any applicable laws or regulations</li>
                            <li>Infringe on intellectual property rights</li>
                            <li>Share your account credentials with unauthorized parties</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">6. Data Ownership</h2>
                        <p>
                            You retain all rights to the data you submit to the Service. By using our Service, you grant us a limited license to process, store, and display your data solely for the purpose of providing the Service. We will not sell or share your data with third parties except as described in our Privacy Policy.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">7. Intellectual Property</h2>
                        <p>
                            The Service, including its original content, features, and functionality, is owned by Attendify Inc. and is protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. You may not copy, modify, or distribute any part of the Service without our prior written consent.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">8. Service Availability</h2>
                        <p>
                            We strive to maintain 99.9% uptime but do not guarantee uninterrupted access to the Service. We may perform scheduled maintenance with advance notice. We are not liable for any downtime or service interruptions beyond our reasonable control.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">9. Limitation of Liability</h2>
                        <p>
                            To the maximum extent permitted by law, Attendify Inc. shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, arising from your use of the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">10. Termination</h2>
                        <p>
                            We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties. Upon termination, your right to use the Service will cease immediately. You may export your data within 30 days of termination.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">11. Changes to Terms</h2>
                        <p>
                            We reserve the right to modify these Terms at any time. We will provide notice of material changes by posting the updated Terms on our website and updating the "Last updated" date. Your continued use of the Service after such changes constitutes acceptance of the new Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">12. Governing Law</h2>
                        <p>
                            These Terms shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be resolved in the courts of San Francisco County, California.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-white mb-4">13. Contact Us</h2>
                        <p>
                            If you have any questions about these Terms of Service, please contact us at:
                        </p>
                        <div className="mt-4 p-6 bg-zinc-900/50 rounded-xl border border-zinc-800">
                            <p className="font-bold text-white">Attendify Inc.</p>
                            <p className="text-zinc-400 mt-2">Email: legal@attendify.com</p>
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
                        <Link href="/privacy" className="text-white hover:text-lime transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="text-lime hover:underline">Terms of Service</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
