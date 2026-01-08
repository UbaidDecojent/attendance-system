import api from './client';

export interface Notification {
    id: string;
    type: 'LEAVE_REQUEST' | 'ATTENDANCE_LATE' | 'ATTENDANCE_ABSENT' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED' | 'GENERAL';
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    entityId?: string;
    entityType?: string;
}

export const notificationsApi = {
    async getMyNotifications(page = 1, limit = 20) {
        const response = await api.get('/notifications', { params: { page, limit } });
        return {
            items: response.data.data,
            meta: response.data.meta,
        };
    },

    async markAsRead(id: string) {
        const response = await api.put(`/notifications/${id}/read`);
        return response.data.data;
    },

    async markAllAsRead() {
        const response = await api.put('/notifications/read-all');
        return response.data.data;
    },
};
