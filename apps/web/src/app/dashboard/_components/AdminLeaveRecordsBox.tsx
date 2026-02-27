'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { employeesApi } from '@/lib/api/employees';
import { leavesApi } from '@/lib/api/leaves';
import { format } from 'date-fns';
import { ChevronRight, X, User, Calendar, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export function AdminLeaveRecordsBox() {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

    // Fetch employees with their overall leave balances
    const { data: employeesData, isLoading: isLoadingEmployees } = useQuery({
        queryKey: ['adminLeaveRecordsEmployees'],
        queryFn: () => employeesApi.getAll({ includeLeaveBalances: true, limit: 1000 }),
    });

    const employees = Array.isArray(employeesData?.data) ? employeesData.data
        : Array.isArray(employeesData?.items) ? employeesData.items
            : Array.isArray(employeesData) ? employeesData
                : [];

    // Fetch full leave history when an employee is selected
    const { data: employeeLeavesRaw, isLoading: isLoadingLeaves } = useQuery({
        queryKey: ['adminEmployeeLeaves', selectedEmployeeId],
        queryFn: () => leavesApi.getAll({ employeeId: selectedEmployeeId!, limit: 100 }),
        enabled: !!selectedEmployeeId,
    });

    const employeeLeaves = Array.isArray(employeeLeavesRaw?.data) ? employeeLeavesRaw.data
        : Array.isArray(employeeLeavesRaw?.items) ? employeeLeavesRaw.items
            : Array.isArray(employeeLeavesRaw) ? employeeLeavesRaw
                : [];

    const selectedEmployee = employees.find((e: any) => e.id === selectedEmployeeId);

    return (
        <>
            <div className="flex-1 flex flex-col h-full bg-[#111111] overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-3">
                    <p className="text-lg font-semibold text-white">Leave Records</p>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: '200px' }}>
                    {isLoadingEmployees ? (
                        <div className="flex items-center justify-center h-full text-zinc-500 text-sm">Loading records...</div>
                    ) : employees.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-zinc-500 text-sm">No employees found.</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider border-b border-white/5">
                                    <th className="pb-2 font-semibold">Employee</th>
                                    <th className="pb-2 font-semibold text-center">Leaves Taken</th>
                                    <th className="pb-2 font-semibold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {employees.map((emp: any) => {
                                    // Using totalUsed and totalRemaining if available from the backend response
                                    const leavesData = emp.leaveSummary?.details || [];
                                    const totalAllowed = leavesData.reduce((acc: number, l: any) => acc + l.total, 0) || 0;
                                    const totalTaken = leavesData.reduce((acc: number, l: any) => acc + l.used, 0) || 0;

                                    // Render 1 out of 18 logic
                                    let displayString = `${totalTaken}`;
                                    if (totalAllowed > 0) {
                                        displayString = `${totalTaken} out of ${totalAllowed}`;
                                    }

                                    return (
                                        <tr key={emp.id} className="border-b border-white/5 hover:bg-zinc-900/30 transition-colors group">
                                            <td className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white uppercase overflow-hidden border border-white/10">
                                                        {emp.firstName.charAt(0)}{emp.lastName?.charAt(0)}
                                                    </div>
                                                    <span className="text-sm text-zinc-200 font-medium truncate max-w-[120px]">
                                                        {emp.firstName} {emp.lastName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 text-center">
                                                <div className="inline-flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1">
                                                    <span className="text-xs font-bold text-zinc-300">
                                                        {displayString}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 text-right">
                                                <button
                                                    onClick={() => setSelectedEmployeeId(emp.id)}
                                                    className="inline-flex items-center gap-1 bg-lime/10 text-lime hover:bg-lime hover:text-black hover:shadow-[0_0_15px_rgba(204,255,0,0.3)] transition-all px-3 py-1.5 rounded-lg text-xs font-bold uppercase"
                                                >
                                                    View <ChevronRight className="h-3 w-3" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* View Details Premium Modal */}
            {selectedEmployeeId && selectedEmployee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-12 animate-in fade-in duration-200" style={{ marginTop: '0px' }}>
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
                        onClick={() => setSelectedEmployeeId(null)}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-5xl h-[85vh] bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden shadow-lime/5">
                        {/* Header */}
                        <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-lime/10 to-transparent pointer-events-none" />

                        <div className="relative flex items-center justify-between p-6 border-b border-white/10 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center shadow-lg">
                                    <User className="h-6 w-6 text-lime" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white tracking-tight">
                                        {selectedEmployee.firstName} {selectedEmployee.lastName}
                                    </h2>
                                    <p className="text-sm text-zinc-400 font-medium tracking-wide">
                                        {selectedEmployee.designation?.name || 'Employee Details'} • Leave Records
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedEmployeeId(null)}
                                className="h-10 w-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 transition-all cursor-pointer z-10"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="relative flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-gradient-to-br from-transparent via-[#090909] to-[#050505]">

                            {/* Stats Overview */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                                <div className="bg-[#111] border border-white/5 rounded-2xl p-5 flex flex-col justify-center relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 opacity-5">
                                        <AlertCircle className="w-24 h-24" />
                                    </div>
                                    <p className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-1">Leaves Allowed</p>
                                    <p className="text-3xl font-black text-white">
                                        {(selectedEmployee.leaveSummary?.details || []).reduce((acc: number, l: any) => acc + l.total, 0) || 0}
                                    </p>
                                </div>
                                <div className="bg-[#111] border border-white/5 rounded-2xl p-5 flex flex-col justify-center relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 opacity-5">
                                        <FileText className="w-24 h-24" />
                                    </div>
                                    <p className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-1">Total Taken</p>
                                    <p className="text-3xl font-black text-lime">
                                        {(selectedEmployee.leaveSummary?.details || []).reduce((acc: number, l: any) => acc + l.used, 0) || 0}
                                    </p>
                                </div>
                                <div className="bg-[#111] border border-white/5 rounded-2xl p-5 flex flex-col justify-center relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 opacity-5">
                                        <CheckCircle className="w-24 h-24" />
                                    </div>
                                    <p className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-1">Remaining</p>
                                    <p className="text-3xl font-black text-white">
                                        {(selectedEmployee.leaveSummary?.details || []).reduce((acc: number, l: any) => acc + l.remaining, 0) || 0}
                                    </p>
                                </div>
                                <div className="bg-[#111] border border-white/5 rounded-2xl p-5 flex flex-col justify-center relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 opacity-5">
                                        <Calendar className="w-24 h-24" />
                                    </div>
                                    <p className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-1">Absent Days</p>
                                    <p className="text-3xl font-black text-red-400">
                                        {selectedEmployee.leaveSummary?.absentDays || 0}
                                    </p>
                                </div>
                            </div>

                            {/* Leave Balance Breakdowns */}
                            {(selectedEmployee.leaveSummary?.details || []).filter((lt: any) => ['Annual Leave', 'Casual Leave', 'Sick Leave'].includes(lt.leaveTypeName)).length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 border-b border-white/5 pb-2">Category Balance Breakdown</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {(selectedEmployee.leaveSummary?.details || [])
                                            .filter((lt: any) => ['Annual Leave', 'Casual Leave', 'Sick Leave'].includes(lt.leaveTypeName))
                                            .map((lt: any) => (
                                                <div key={lt.leaveTypeId} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lt.color || '#CCFF00' }} />
                                                        <span className="text-sm font-semibold text-white">{lt.leaveTypeName}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-sm font-bold text-white">{lt.used}</span>
                                                        <span className="text-xs text-zinc-500 font-medium"> / {lt.total}</span>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Leave History Table */}
                            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 border-b border-white/5 pb-2">Complete Leave History</h3>
                            {isLoadingLeaves ? (
                                <div className="text-center py-12 text-zinc-500">Loading leave history...</div>
                            ) : employeeLeaves.length === 0 ? (
                                <div className="text-center py-12 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl">
                                    <FileText className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
                                    <p className="text-zinc-500 font-medium">No leave histories recorded yet.</p>
                                </div>
                            ) : (
                                <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl overflow-hidden shadow-inner">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-[#141414]">
                                            <tr className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest border-b border-white/5">
                                                <th className="py-4 px-6">Leave Dates</th>
                                                <th className="py-4 px-6">Duration</th>
                                                <th className="py-4 px-6">Leave Type</th>
                                                <th className="py-4 px-6 w-1/3">Reason</th>
                                                <th className="py-4 px-6 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm divide-y divide-white/5">
                                            {employeeLeaves.map((leave: any) => {
                                                const isApproved = leave.status === 'APPROVED';
                                                const isRejected = leave.status === 'REJECTED';
                                                const isPending = leave.status === 'PENDING';

                                                return (
                                                    <tr key={leave.id} className="hover:bg-white/[0.02] transition-colors">
                                                        <td className="py-4 px-6">
                                                            <div className="font-bold text-white whitespace-nowrap">
                                                                {format(new Date(leave.startDate), 'MMM d, yyyy')}
                                                            </div>
                                                            {new Date(leave.startDate).getTime() !== new Date(leave.endDate).getTime() && (
                                                                <div className="text-xs text-zinc-500 font-medium">
                                                                    to {format(new Date(leave.endDate), 'MMM d, yyyy')}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <span className="font-bold text-zinc-300">
                                                                {leave.totalDays} {leave.totalDays === 1 ? 'Day' : 'Days'}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <div className="inline-flex items-center gap-1.5 bg-zinc-800/50 border border-zinc-700/50 px-2.5 py-1 rounded-full whitespace-nowrap">
                                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: leave.leaveType?.color || '#CCFF00' }} />
                                                                <span className="text-xs font-bold text-zinc-300">{leave.leaveType?.name || 'Leave'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <p className="text-sm text-zinc-400 break-words whitespace-normal leading-relaxed">
                                                                {leave.reason || '-'}
                                                            </p>
                                                        </td>
                                                        <td className="py-4 px-6 text-right">
                                                            <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-bold border uppercase tracking-wider ${isApproved ? 'bg-lime/10 text-lime border-lime/20' :
                                                                isRejected ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                                }`}>
                                                                {leave.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
