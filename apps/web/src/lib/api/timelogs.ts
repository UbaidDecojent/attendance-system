import api from './client';
import { BillingType } from './tasks';

export type TimeLogStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface TimeLog {
    id: string;
    date: string;
    durationMinutes: number;
    billingType: BillingType;
    description?: string;
    status: TimeLogStatus;

    project: { id: string; title: string };
    task: { id: string; name: string };
    employee: {
        id: string;
        firstName: string;
        lastName: string;
        avatar?: string;
    };
}

export const timeLogsApi = {
    getAll: async (params?: {
        startDate?: string;
        endDate?: string;
        projectIds?: string[];
        userIds?: string[];
        status?: TimeLogStatus;
        billingType?: BillingType;
        clientNames?: string[];
    }) => {
        const searchParams = new URLSearchParams();

        if (params?.startDate) searchParams.append('startDate', params.startDate);
        if (params?.endDate) searchParams.append('endDate', params.endDate);
        if (params?.status) searchParams.append('status', params.status);
        if (params?.billingType) searchParams.append('billingType', params.billingType);

        if (params?.projectIds) {
            params.projectIds.forEach(id => searchParams.append('projectIds', id));
        }
        if (params?.userIds) {
            params.userIds.forEach(id => searchParams.append('userIds', id));
        }
        if (params?.clientNames) {
            params.clientNames.forEach(name => searchParams.append('clientNames', name));
        }

        const queryString = searchParams.toString();
        // Manually constructing URL to bypass axios serialization issues
        const response = await api.get<any>(`/time-logs?${queryString}`);
        return response.data.data;
    },
    create: async (data: any) => {
        const response = await api.post<any>('/time-logs', data);
        return response.data.data;
    },
    update: async (id: string, data: any) => {
        const response = await api.patch<any>(`/time-logs/${id}`, data);
        return response.data.data;
    },
    updateStatus: async (id: string, status: TimeLogStatus) => {
        const response = await api.patch<any>(`/time-logs/${id}/status`, { status });
        return response.data.data;
    },
    delete: async (id: string) => {
        return api.delete(`/time-logs/${id}`);
    }
};
