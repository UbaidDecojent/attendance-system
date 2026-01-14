
import api from './client';

export interface Shift {
    id: string;
    name: string;
    code: string;
    description?: string;
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
    breakDuration: number;
    workingDays: number[];
    graceTimeIn: number;
    graceTimeOut: number;
    isDefault: boolean;
    isActive: boolean;
}

export const shiftsApi = {
    getAll: async (): Promise<Shift[]> => {
        const response = await api.get<{ data: Shift[] }>('/shifts');
        return response.data.data;
    },

    create: async (data: Partial<Shift>): Promise<Shift> => {
        const response = await api.post<{ data: Shift }>('/shifts', data);
        return response.data.data;
    },

    update: async (id: string, data: Partial<Shift>): Promise<Shift> => {
        const response = await api.put<{ data: Shift }>(`/shifts/${id}`, data);
        return response.data.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/shifts/${id}`);
    },

    assign: async (id: string, employeeIds: string[]): Promise<any> => {
        const response = await api.post<{ data: any }>(`/shifts/${id}/assign`, { employeeIds });
        return response.data.data;
    }
};
