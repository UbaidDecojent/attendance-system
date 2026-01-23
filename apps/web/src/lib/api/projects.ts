import api from './client';

export interface Project {
    id: string;
    title: string;
    clientName?: string;
    description?: string;
    status: string;
    owner?: {
        id: string;
        firstName: string;
        lastName: string;
        avatar?: string;
    };
    taskStats?: any;
    createdAt: string;
}

export const projectsApi = {
    getAll: async () => {
        const response = await api.get<Project[]>('/projects');
        return response.data;
    },
    create: async (data: { title: string; clientName?: string; description?: string; ownerId: string }) => {
        const response = await api.post<Project>('/projects', data);
        return response.data;
    },
    update: async (id: string, data: any) => {
        const response = await api.patch<Project>(`/projects/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        return api.delete(`/projects/${id}`);
    }
};
