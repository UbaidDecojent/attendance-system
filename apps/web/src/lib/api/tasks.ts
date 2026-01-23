import api from './client';

export type TaskStatus = 'TO_DO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'ON_HOLD' | 'COMPLETED' | 'CLOSED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type BillingType = 'BILLABLE' | 'NON_BILLABLE';

export interface Task {
    id: string;
    name: string;
    description?: string;
    projectId: string;
    status: TaskStatus;
    priority: TaskPriority;
    billingType: BillingType;
    startDate?: string;
    dueDate?: string;
    duration?: string;
    assignees: {
        id: string;
        firstName: string;
        lastName: string;
        avatar?: string;
        designation?: { name: string };
    }[];
    project: {
        id: string;
        title: string;
    };
    createdAt: string;
}

export const tasksApi = {
    getAll: async (params?: {
        projectId?: string;
        status?: string;
        priority?: string;
        billingType?: string;
        assigneeId?: string;
        startDate?: string;
        dueDate?: string;
    }) => {
        const response = await api.get<Task[]>('/tasks', { params });
        return response.data;
    },
    create: async (data: any) => {
        const response = await api.post<Task>('/tasks', data);
        return response.data;
    },
    update: async (id: string, data: any) => {
        const response = await api.patch<Task>(`/tasks/${id}`, data);
        return response.data;
    }
};
