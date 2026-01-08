'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, User, Mail, Phone, Building, Briefcase, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { employeesApi, departmentsApi, shiftsApi } from '@/lib/api/employees';

const employeeSchema = z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email'),
    phone: z.string().optional(),
    employeeCode: z.string().min(2, 'Employee code must be at least 2 characters'),
    departmentId: z.string().optional(),
    designationId: z.string().optional(),
    shiftId: z.string().optional(),
    dateOfJoining: z.string().optional(),
    gender: z.string().optional(),
    dateOfBirth: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    emergencyContactRelation: z.string().optional(),
    employmentType: z.string().optional(),
});

type EmployeeForm = z.infer<typeof employeeSchema>;

interface Department { id: string; name: string; }
interface Designation { id: string; name: string; }
interface Shift { id: string; name: string; startTime: string; endTime: string; }

export default function EditEmployeePage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const employeeId = params.id as string;

    const [departments, setDepartments] = useState<Department[]>([]);
    const [designations, setDesignations] = useState<Designation[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);

    const { data: employee, isLoading: isLoadingEmployee } = useQuery({
        queryKey: ['employee', employeeId],
        queryFn: () => employeesApi.getById(employeeId),
        enabled: !!employeeId,
    });

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<EmployeeForm>({
        resolver: zodResolver(employeeSchema),
    });

    // Set form values when employee data is loaded
    useEffect(() => {
        if (employee) {
            reset({
                firstName: employee.firstName || '',
                lastName: employee.lastName || '',
                email: employee.email || '',
                phone: employee.phone || '',
                employeeCode: employee.employeeCode || '',
                departmentId: employee.departmentId || '',
                designationId: employee.designationId || '',
                shiftId: employee.shiftId || '',
                dateOfJoining: employee.dateOfJoining ? new Date(employee.dateOfJoining).toISOString().split('T')[0] : '',
                gender: employee.gender || '',
                dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : '',
                address: employee.address || '',
                city: employee.city || '',
                state: employee.state || '',
                country: employee.country || '',
                emergencyContactName: employee.emergencyContactName || '',
                emergencyContactPhone: employee.emergencyContactPhone || '',
                emergencyContactRelation: employee.emergencyContactRelation || '',
                employmentType: employee.employmentType || 'FULL_TIME',
            });
        }
    }, [employee, reset]);

    // Fetch departments, designations, and shifts
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [deptData, shiftData] = await Promise.all([
                    departmentsApi.getAll(),
                    shiftsApi.getAll(),
                ]);

                // Handle different response formats
                setDepartments(Array.isArray(deptData) ? deptData : deptData?.items || []);
                setShifts(Array.isArray(shiftData) ? shiftData : shiftData?.items || []);
            } catch (error) {
                console.error('Failed to fetch form data:', error);
            }
        };
        fetchData();
    }, []);

    const updateMutation = useMutation({
        mutationFn: (data: EmployeeForm) => {
            // Clean up empty optional fields
            const payload: any = { ...data };
            if (!payload.departmentId) delete payload.departmentId;
            if (!payload.designationId) delete payload.designationId;
            if (!payload.shiftId) delete payload.shiftId;
            if (!payload.dateOfBirth) delete payload.dateOfBirth;
            if (!payload.dateOfJoining) delete payload.dateOfJoining;
            if (!payload.gender) delete payload.gender;
            if (!payload.phone) delete payload.phone;
            if (!payload.address) delete payload.address;
            if (!payload.city) delete payload.city;
            if (!payload.state) delete payload.state;
            if (!payload.country) delete payload.country;
            if (!payload.emergencyContactName) delete payload.emergencyContactName;
            if (!payload.emergencyContactPhone) delete payload.emergencyContactPhone;
            if (!payload.emergencyContactRelation) delete payload.emergencyContactRelation;

            return employeesApi.update(employeeId, payload);
        },
        onSuccess: () => {
            toast.success('Employee updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            router.push(`/dashboard/employees/${employeeId}`);
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to update employee');
        },
    });

    const onSubmit = (data: EmployeeForm) => {
        updateMutation.mutate(data);
    };

    if (isLoadingEmployee) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 w-48 bg-muted rounded" />
                    <div className="bg-card rounded-xl border p-6 space-y-4">
                        <div className="h-4 w-full bg-muted rounded" />
                        <div className="h-4 w-3/4 bg-muted rounded" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href={`/dashboard/employees/${employeeId}`}
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Employee
                </Link>
                <h1 className="text-3xl font-bold">Edit Employee</h1>
                <p className="text-muted-foreground mt-1">
                    Update employee information
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Personal Information */}
                <div className="bg-card rounded-xl border shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Personal Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-medium mb-2 block">First Name *</label>
                            <input
                                type="text"
                                {...register('firstName')}
                                className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                            {errors.firstName && (
                                <p className="text-destructive text-sm mt-1">{errors.firstName.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Last Name *</label>
                            <input
                                type="text"
                                {...register('lastName')}
                                className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                            {errors.lastName && (
                                <p className="text-destructive text-sm mt-1">{errors.lastName.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Email *</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <input
                                    type="email"
                                    {...register('email')}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>
                            {errors.email && (
                                <p className="text-destructive text-sm mt-1">{errors.email.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Phone</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <input
                                    type="tel"
                                    {...register('phone')}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Gender</label>
                            <select
                                {...register('gender')}
                                className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            >
                                <option value="">Select gender</option>
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                                <option value="O">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Date of Birth</label>
                            <input
                                type="date"
                                {...register('dateOfBirth')}
                                className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="text-sm font-medium mb-2 block">Address</label>
                            <textarea
                                {...register('address')}
                                rows={2}
                                className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">City</label>
                            <input
                                type="text"
                                {...register('city')}
                                className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">State/Province</label>
                            <input
                                type="text"
                                {...register('state')}
                                className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Country</label>
                            <input
                                type="text"
                                {...register('country')}
                                className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Emergency Contact */}
                <div className="bg-card rounded-xl border shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4">Emergency Contact</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Contact Name</label>
                            <input
                                type="text"
                                {...register('emergencyContactName')}
                                className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Contact Phone</label>
                            <input
                                type="tel"
                                {...register('emergencyContactPhone')}
                                className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Relationship</label>
                            <input
                                type="text"
                                {...register('emergencyContactRelation')}
                                className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Employment Information */}
                <div className="bg-card rounded-xl border shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        Employment Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Employee Code *</label>
                            <input
                                type="text"
                                {...register('employeeCode')}
                                className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                            {errors.employeeCode && (
                                <p className="text-destructive text-sm mt-1">{errors.employeeCode.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Date of Joining</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <input
                                    type="date"
                                    {...register('dateOfJoining')}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Employment Type</label>
                            <select
                                {...register('employmentType')}
                                className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            >
                                <option value="FULL_TIME">Full Time</option>
                                <option value="PART_TIME">Part Time</option>
                                <option value="CONTRACT">Contract</option>
                                <option value="INTERN">Intern</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Department</label>
                            <div className="relative">
                                <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <select
                                    {...register('departmentId')}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
                                >
                                    <option value="">Select department</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Shift</label>
                            <select
                                {...register('shiftId')}
                                className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            >
                                <option value="">Select shift</option>
                                {shifts.map((shift) => (
                                    <option key={shift.id} value={shift.id}>
                                        {shift.name} ({shift.startTime} - {shift.endTime})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-4">
                    <Link
                        href={`/dashboard/employees/${employeeId}`}
                        className="px-6 py-3 rounded-xl border hover:bg-muted transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={updateMutation.isPending}
                        className="px-8 py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-semibold hover:from-primary/90 hover:to-purple-600/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 flex items-center gap-2"
                    >
                        {updateMutation.isPending ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
