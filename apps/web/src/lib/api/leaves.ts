import api from './client';

export const leavesApi = {
    async getAll(params?: {
        employeeId?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }) {
        const response = await api.get('/leaves', { params });
        return response.data;
    },

    async getLeaveTypes() {
        try {
            const response = await api.get('/leaves/types');
            console.log('API Response for Leave Types:', response);
            return response.data.data;
        } catch (error) {
            console.error('API Error for Leave Types:', error);
            throw error;
        }
    },

    async getById(id: string) {
        const response = await api.get(`/leaves/${id}`);
        return response.data.data;
    },

    async create(data: {
        leaveTypeId: string;
        startDate: string;
        endDate: string;
        reason: string;
        isHalfDay?: boolean;
        halfDayType?: string;
    }) {
        const response = await api.post('/leaves', data);
        return response.data.data;
    },

    async approve(id: string, note?: string) {
        const response = await api.put(`/leaves/${id}/approve`, { note });
        return response.data.data;
    },

    async reject(id: string, reason: string) {
        const response = await api.put(`/leaves/${id}/reject`, { reason });
        return response.data.data;
    },

    async cancel(id: string) {
        const response = await api.put(`/leaves/${id}/cancel`);
        return response.data.data;
    },

    async getPending() {
        const response = await api.get('/leaves/pending');
        return response.data.data;
    },

    async getCalendar(month: number, year: number) {
        const response = await api.get('/leaves/calendar', { params: { month, year } });
        return response.data.data;
    },
};

export const holidaysApi = {
    async getAll(year?: number) {
        const response = await api.get('/holidays', { params: { year } });
        return response.data.data;
    },

    async create(data: { name: string; date: string; type?: string; isOptional?: boolean }) {
        const response = await api.post('/holidays', data);
        return response.data.data;
    },

    async update(id: string, data: any) {
        const response = await api.put(`/holidays/${id}`, data);
        return response.data.data;
    },

    async delete(id: string) {
        const response = await api.delete(`/holidays/${id}`);
        return response.data;
    },
};
