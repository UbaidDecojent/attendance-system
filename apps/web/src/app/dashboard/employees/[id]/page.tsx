'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Mail,
    Phone,
    Building2,
    Calendar,
    MapPin,
    User,
    Briefcase,
    Clock,
    Edit,
    UserX,
    UserCheck,
} from 'lucide-react';
import { employeesApi } from '@/lib/api/employees';
import { cn, getInitials } from '@/lib/utils';
import { format } from 'date-fns';
import { useState } from 'react';
import ManageLeaveBalanceModal from '@/components/employees/ManageLeaveBalanceModal';

export default function EmployeeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const employeeId = params.id as string;
    const [showLeaveModal, setShowLeaveModal] = useState(false);

    const { data: employee, isLoading, error } = useQuery({
        queryKey: ['employee', employeeId],
        queryFn: () => employeesApi.getById(employeeId),
        enabled: !!employeeId,
    });

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 w-48 bg-muted rounded" />
                    <div className="bg-card rounded-xl border p-6">
                        <div className="flex items-center gap-6">
                            <div className="h-24 w-24 rounded-full bg-muted" />
                            <div className="space-y-3">
                                <div className="h-6 w-48 bg-muted rounded" />
                                <div className="h-4 w-32 bg-muted rounded" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !employee) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="text-center py-12 glass-card rounded-2xl">
                    <h2 className="text-xl font-semibold mb-2">Employee Not Found</h2>
                    <p className="text-muted-foreground mb-4">
                        The employee you're looking for doesn't exist or has been removed.
                    </p>
                    <Link
                        href="/dashboard/employees"
                        className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Employees
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Link
                    href="/dashboard/employees"
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Employees
                </Link>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowLeaveModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border hover:bg-muted transition-colors bg-background"
                    >
                        <Calendar className="h-4 w-4" />
                        Manage Leave
                    </button>
                    <Link
                        href={`/dashboard/employees/${employeeId}/edit`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border hover:bg-muted transition-colors"
                    >
                        <Edit className="h-4 w-4" />
                        Edit
                    </Link>
                </div>
            </div>

            {/* Profile Card */}
            <div className="bg-card rounded-xl border shadow-sm p-6">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                    <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                        {getInitials(employee.firstName, employee.lastName)}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-2xl font-bold">
                                    {employee.firstName} {employee.lastName}
                                </h1>
                                <p className="text-muted-foreground">
                                    {employee.designation?.name || 'No designation'}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Employee Code: {employee.employeeCode}
                                </p>
                            </div>
                            <span className={cn(
                                'px-3 py-1 rounded-full text-sm font-medium',
                                employee.isActive
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                            )}>
                                {employee.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <Mail className="h-5 w-5" />
                                <span>{employee.email}</span>
                            </div>
                            {employee.phone && (
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <Phone className="h-5 w-5" />
                                    <span>{employee.phone}</span>
                                </div>
                            )}
                            {employee.department && (
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <Building2 className="h-5 w-5" />
                                    <span>{employee.department.name}</span>
                                </div>
                            )}
                            {employee.shift && (
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <Clock className="h-5 w-5" />
                                    <span>{employee.shift.name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Details Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="bg-card rounded-xl border shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Personal Information
                    </h2>
                    <dl className="space-y-4">
                        {employee.gender && (
                            <div>
                                <dt className="text-sm text-muted-foreground">Gender</dt>
                                <dd className="font-medium">
                                    {employee.gender === 'M' ? 'Male' : employee.gender === 'F' ? 'Female' : 'Other'}
                                </dd>
                            </div>
                        )}
                        {employee.dateOfBirth && (
                            <div>
                                <dt className="text-sm text-muted-foreground">Date of Birth</dt>
                                <dd className="font-medium">
                                    {format(new Date(employee.dateOfBirth), 'MMMM d, yyyy')}
                                </dd>
                            </div>
                        )}
                        {employee.address && (
                            <div>
                                <dt className="text-sm text-muted-foreground">Address</dt>
                                <dd className="font-medium">{employee.address}</dd>
                            </div>
                        )}
                        {(employee.city || employee.state || employee.country) && (
                            <div>
                                <dt className="text-sm text-muted-foreground">Location</dt>
                                <dd className="font-medium">
                                    {[employee.city, employee.state, employee.country].filter(Boolean).join(', ')}
                                </dd>
                            </div>
                        )}
                    </dl>
                </div>

                {/* Employment Information */}
                <div className="bg-card rounded-xl border shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        Employment Information
                    </h2>
                    <dl className="space-y-4">
                        <div>
                            <dt className="text-sm text-muted-foreground">Date of Joining</dt>
                            <dd className="font-medium">
                                {employee.dateOfJoining
                                    ? format(new Date(employee.dateOfJoining), 'MMMM d, yyyy')
                                    : 'N/A'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm text-muted-foreground">Employment Type</dt>
                            <dd className="font-medium">
                                {employee.employmentType?.replace('_', ' ') || 'Full Time'}
                            </dd>
                        </div>
                        {employee.department && (
                            <div>
                                <dt className="text-sm text-muted-foreground">Department</dt>
                                <dd className="font-medium">{employee.department.name}</dd>
                            </div>
                        )}
                        {employee.designation && (
                            <div>
                                <dt className="text-sm text-muted-foreground">Designation</dt>
                                <dd className="font-medium">{employee.designation.name}</dd>
                            </div>
                        )}
                        {employee.manager && (
                            <div>
                                <dt className="text-sm text-muted-foreground">Reports To</dt>
                                <dd className="font-medium">
                                    {employee.manager.firstName} {employee.manager.lastName}
                                </dd>
                            </div>
                        )}
                    </dl>
                </div>

                {/* Emergency Contact */}
                {(employee.emergencyContactName || employee.emergencyContactPhone) && (
                    <div className="bg-card rounded-xl border shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-4">Emergency Contact</h2>
                        <dl className="space-y-4">
                            {employee.emergencyContactName && (
                                <div>
                                    <dt className="text-sm text-muted-foreground">Name</dt>
                                    <dd className="font-medium">{employee.emergencyContactName}</dd>
                                </div>
                            )}
                            {employee.emergencyContactPhone && (
                                <div>
                                    <dt className="text-sm text-muted-foreground">Phone</dt>
                                    <dd className="font-medium">{employee.emergencyContactPhone}</dd>
                                </div>
                            )}
                            {employee.emergencyContactRelation && (
                                <div>
                                    <dt className="text-sm text-muted-foreground">Relationship</dt>
                                    <dd className="font-medium">{employee.emergencyContactRelation}</dd>
                                </div>
                            )}
                        </dl>
                    </div>
                )}

                {/* Account Status */}
                {employee.user && (
                    <div className="bg-card rounded-xl border shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-4">Account Status</h2>
                        <dl className="space-y-4">
                            <div>
                                <dt className="text-sm text-muted-foreground">User Role</dt>
                                <dd className="font-medium">{employee.user.role?.replace('_', ' ')}</dd>
                            </div>
                            <div>
                                <dt className="text-sm text-muted-foreground">Account Status</dt>
                                <dd>
                                    <span className={cn(
                                        'px-2 py-0.5 rounded-full text-xs font-medium',
                                        employee.user.status === 'ACTIVE'
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                    )}>
                                        {employee.user.status}
                                    </span>
                                </dd>
                            </div>
                            {employee.user.lastLoginAt && (
                                <div>
                                    <dt className="text-sm text-muted-foreground">Last Login</dt>
                                    <dd className="font-medium">
                                        {format(new Date(employee.user.lastLoginAt), 'MMM d, yyyy h:mm a')}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </div>
                )}
            </div>

            <ManageLeaveBalanceModal
                isOpen={showLeaveModal}
                onClose={() => setShowLeaveModal(false)}
                employeeId={employeeId}
                employeeName={`${employee.firstName} ${employee.lastName}`}
            />
        </div>
    );
}
