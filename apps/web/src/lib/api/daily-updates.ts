import api from './client';

export type BillingType = 'BILLABLE' | 'NON_BILLABLE';
export type ProjectType = 'CLIENT' | 'IN_HOUSE';
export type DailyUpdateStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface DailyUpdate {
    id: string;
    projectId: string;
    taskId: string;
    hoursWorked: number;
    deadline?: string;
    billingType: BillingType;
    projectType: ProjectType;
    status: DailyUpdateStatus;
    notes?: string;
    project: {
        id: string;
        title: string;
        clientName?: string;
    };
    task: {
        id: string;
        name: string;
    };
    createdAt: string;
}

export interface AssignedProject {
    id: string;
    title: string;
    clientName?: string;
    tasks: {
        id: string;
        title: string;
    }[];
}

export interface WorkloadEmployee {
    employee: {
        id: string;
        firstName: string;
        lastName: string;
        avatar?: string;
        dateOfJoining: string;
        department?: { name: string };
        designation?: { name: string };
    };
    updates: {
        id: string;
        project: { id: string; title: string; clientName?: string };
        task: { id: string; name: string };
        hoursWorked: number;
        deadline?: string;
        billingType: BillingType;
        projectType: ProjectType;
        status: DailyUpdateStatus;
        notes?: string;
    }[];
    totalHours: number;
    occupancyPercent: number;
    statusBadge: string;
    statusColor: string;
}

export const dailyUpdatesApi = {
    // Create a daily update
    create: async (data: {
        projectId: string;
        taskId: string;
        hoursWorked: number;
        deadline?: string;
        billingType: BillingType;
        projectType: ProjectType;
        notes?: string;
    }) => {
        const response = await api.post<any>('/daily-updates', data);
        return response.data.data || response.data;
    },

    // Get my today's updates
    getMyTodayUpdates: async () => {
        const response = await api.get<any>('/daily-updates/my-today');
        return response.data.data || response.data;
    },

    // Get projects and tasks assigned to me
    getAssignedProjects: async () => {
        const response = await api.get<any>('/daily-updates/assigned-projects');
        return response.data.data || response.data;
    },

    // Get workload view (admin only)
    getWorkloadView: async () => {
        const response = await api.get<any>('/daily-updates/workload');
        return response.data.data || response.data;
    },

    // Update a daily update
    update: async (id: string, data: {
        hoursWorked?: number;
        deadline?: string;
        billingType?: BillingType;
        projectType?: ProjectType;
        notes?: string;
        status?: DailyUpdateStatus;
    }) => {
        const response = await api.patch<any>(`/daily-updates/${id}`, data);
        return response.data.data || response.data;
    },

    // Delete a daily update
    delete: async (id: string) => {
        const response = await api.delete<any>(`/daily-updates/${id}`);
        return response.data.data || response.data;
    }
};
