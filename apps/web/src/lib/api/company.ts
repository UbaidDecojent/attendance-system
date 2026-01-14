import api from './client';

export const companyApi = {
    async getSettings() {
        const response = await api.get('/company/settings');
        return response.data.data;
    },

    async updateSettings(data: any) {
        const response = await api.put('/company/settings', data);
        return response.data.data;
    },

    async getOfficeLocations() {
        const response = await api.get('/company/locations');
        return response.data.data;
    },

    async addOfficeLocation(data: { name: string; latitude: number; longitude: number; radius: number; address?: string }) {
        const response = await api.post('/company/locations', data);
        return response.data.data;
    },

    async updateOfficeLocation(id: string, data: any) {
        const response = await api.put(`/company/locations/${id}`, data);
        return response.data.data;
    }
};
