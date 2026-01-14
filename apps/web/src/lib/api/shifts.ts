
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
    getAll: async () => {
        const response = await api.get('/shifts');
        return response.data.data;
    },

    create: async (data: Partial<Shift>) => {
        const response = await api.post('/shifts', data);
        return response.data.data;
    },

    update: async (id: string, data: Partial<Shift>) => {
        const response = await api.put(`/shifts/${id}`, data);
        return response.data.data;
    },

    delete: async (id: string) => {
        await api.delete(`/shifts/${id}`);
    },

    assign: async (id: string, employeeIds: string[]) => {
        const response = await api.post(`/shifts/${id}/assign`, { employeeIds });
        return response.data.data;
    }
};
