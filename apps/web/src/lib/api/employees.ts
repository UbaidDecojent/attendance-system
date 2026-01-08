import api from './client';

export const employeesApi = {
    async getAll(params?: {
        search?: string;
        departmentId?: string;
        status?: string;
        page?: number;
        limit?: number;
    }) {
        const response = await api.get('/employees', { params });
        return response.data;
    },

    async getById(id: string) {
        const response = await api.get(`/employees/${id}`);
        return response.data.data;
    },

    async create(data: any) {
        const response = await api.post('/employees', data);
        return response.data.data;
    },

    async update(id: string, data: any) {
        const response = await api.put(`/employees/${id}`, data);
        return response.data.data;
    },

    async deactivate(id: string) {
        const response = await api.delete(`/employees/${id}`);
        return response.data;
    },

    async reactivate(id: string) {
        const response = await api.put(`/employees/${id}/reactivate`);
        return response.data;
    },

    async getLeaveBalances(id: string) {
        const response = await api.get(`/employees/${id}/leave-balances`);
        return response.data.data;
    },

    async updateLeaveBalance(id: string, data: { leaveTypeId: string; adjustment: number; reason: string }) {
        const response = await api.put(`/employees/${id}/leave-balances`, data);
        return response.data.data;
    },

    async getStats() {
        const response = await api.get('/employees/stats');
        return response.data.data;
    },
};

export const departmentsApi = {
    async getAll() {
        const response = await api.get('/departments');
        return response.data.data;
    },

    async create(data: { name: string; code: string; description?: string; parentId?: string }) {
        const response = await api.post('/departments', data);
        return response.data.data;
    },

    async update(id: string, data: any) {
        const response = await api.put(`/departments/${id}`, data);
        return response.data.data;
    },

    async delete(id: string) {
        const response = await api.delete(`/departments/${id}`);
        return response.data;
    },
};

export const shiftsApi = {
    async getAll() {
        const response = await api.get('/shifts');
        return response.data.data;
    },

    async create(data: any) {
        const response = await api.post('/shifts', data);
        return response.data.data;
    },

    async update(id: string, data: any) {
        const response = await api.put(`/shifts/${id}`, data);
        return response.data.data;
    },

    async delete(id: string) {
        const response = await api.delete(`/shifts/${id}`);
        return response.data;
    },

    async assignToEmployees(id: string, employeeIds: string[]) {
        const response = await api.post(`/shifts/${id}/assign`, { employeeIds });
        return response.data;
    },
};
