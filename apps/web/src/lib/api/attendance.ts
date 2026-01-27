import api from './client';

export const attendanceApi = {
    async checkIn(data: { type?: string; workLocation?: string; location?: { lat: number; lng: number }; note?: string }) {
        const response = await api.post('/attendance/check-in', data);
        return response.data.data;
    },

    async checkOut(data: { location?: { lat: number; lng: number }; note?: string }) {
        const response = await api.post('/attendance/check-out', data);
        return response.data.data;
    },

    async startBreak() {
        const response = await api.post('/attendance/break/start');
        return response.data.data;
    },

    async endBreak() {
        const response = await api.post('/attendance/break/end');
        return response.data.data;
    },

    async getTodayStatus() {
        const response = await api.get('/attendance/today');
        return response.data.data;
    },

    async getMyHistory(params?: { startDate?: string; endDate?: string; page?: number; limit?: number }) {
        const response = await api.get('/attendance/my-history', { params });
        // Restore verified working path for items
        return {
            items: response.data.data,
            meta: response.data.meta,
            // Try explicit path, check if summary is sibling to data
            summary: response.data.summary || { present: 0, absent: 0, late: 0, onLeave: 0 }
        };
    },

    async getHistory(params?: {
        employeeId?: string;
        departmentId?: string;
        startDate?: string;
        endDate?: string;
        status?: string;
        page?: number;
        limit?: number;
    }) {
        const response = await api.get('/attendance/history', { params });
        return {
            items: response.data.data,
            meta: response.data.meta,
            summary: response.data.summary || { present: 0, absent: 0, late: 0, onLeave: 0 }
        };
    },

    async getDashboard(date?: string) {
        const response = await api.get('/attendance/dashboard', { params: { date } });
        return response.data.data;
    },

    async createManualEntry(data: {
        employeeId: string;
        date: string;
        checkInTime?: string;
        checkOutTime?: string;
        status?: string;
        reason: string;
    }) {
        const response = await api.post('/attendance/manual', data);
        return response.data.data;
    },

    async approveAttendance(id: string) {
        const response = await api.put(`/attendance/${id}/approve`);
        return response.data.data;
    },

    async lockAttendance(id: string) {
        const response = await api.put(`/attendance/${id}/lock`);
        return response.data.data;
    },

    async createRegularization(data: { date: string; checkInTime?: string; checkOutTime?: string; reason: string }) {
        const response = await api.post('/attendance/regularization', data);
        return response.data;
    },

    async getRegularizationRequests(params?: { status?: string; employeeId?: string }) {
        const response = await api.get('/attendance/regularization', { params });
        return response.data;
    },

    async updateRegularization(id: string, data: { status: string; rejectionReason?: string }) {
        const response = await api.put(`/attendance/regularization/${id}`, data);
        return response.data;
    },
};
