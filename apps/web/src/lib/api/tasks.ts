import api from './client';

export type TaskStatus = 'TO_DO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'ON_HOLD' | 'COMPLETED' | 'CLOSED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type BillingType = 'BILLABLE' | 'NON_BILLABLE';

export interface Task {
    id: string;
    name: string;
    description?: string;
    projectId: string;
    parentTaskId?: string; // If set, this is a subtask
    status: TaskStatus;
    priority: TaskPriority;
    billingType: BillingType;
    startDate?: string;
    dueDate?: string;

    duration?: string;
    estimatedHours?: number;
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
    parentTask?: {
        id: string;
        name: string;
    };
    subtasks?: {
        id: string;
        name: string;
        status: TaskStatus;
        priority: TaskPriority;
        assignees?: { id: string; firstName: string; lastName: string; avatar?: string }[];
        _count?: { timeLogs: number };
    }[];
    timeLogs?: any[];
    totalMinutes?: number;
    totalHours?: number;
    _count?: {
        subtasks: number;
        timeLogs: number;
    };
    createdAt: string;
}

export interface WorkloadResponse {
    id: string; // Employee ID
    name: string;
    avatar: string | null;
    designation: string;
    capacity: number;
    workload: Record<string, number>;
    tasks: {
        id: string;
        name: string;
        project: string;
        startDate: string;
        dueDate: string;
        estimatedHours: number;
        dailyHours: number;
        dailyLoggedHours?: Record<string, number>;
        status: string;
        billingType?: string;
    }[];
}

export const tasksApi = {
    getWorkload: async (startDate: string, endDate: string) => {
        const response = await api.get<any>('/tasks/workload', { params: { startDate, endDate } });
        return response.data.data || response.data;
    },
    getAll: async (params?: {
        projectId?: string;
        status?: string;
        priority?: string;
        billingType?: string;
        assigneeId?: string;
        startDate?: string;
        dueDate?: string;
        parentTaskId?: string; // Filter subtasks by parent
        includeSubtasks?: boolean; // Include ALL tasks (parents + subtasks)
    }) => {
        const response = await api.get<Task[]>('/tasks', { params });
        return response.data;
    },
    getOne: async (id: string) => {
        const response = await api.get<any>(`/tasks/${id}`);
        return response.data.data || response.data;
    },
    create: async (data: any) => {
        const response = await api.post<any>('/tasks', data);
        return response.data.data || response.data;
    },
    update: async (id: string, data: any) => {
        const response = await api.patch<any>(`/tasks/${id}`, data);
        return response.data.data || response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete<any>(`/tasks/${id}`);
        return response.data.data || response.data;
    }
};
