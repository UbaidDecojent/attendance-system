import api from './client';

interface LoginResponse {
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        companyId: string;
        companyName: string;
        avatar?: string;
    };
    accessToken: string;
    expiresIn: number;
}

interface TwoFALoginResponse {
    requires2FA: true;
    tempToken: string;
}

interface RegisterData {
    companyName: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    country?: string;
    timezone?: string;
}

export const authApi = {
    async login(email: string, password: string): Promise<LoginResponse | TwoFALoginResponse> {
        const response = await api.post('/auth/login', { email, password });

        if (response.data.data?.accessToken) {
            localStorage.setItem('accessToken', response.data.data.accessToken);
        }

        return response.data.data;
    },

    async verify2FA(tempToken: string, code: string): Promise<LoginResponse> {
        const response = await api.post('/auth/login/2fa', { tempToken, code });

        if (response.data.data?.accessToken) {
            localStorage.setItem('accessToken', response.data.data.accessToken);
        }

        return response.data.data;
    },

    async register(data: RegisterData) {
        const response = await api.post('/auth/register', data);
        return response.data.data;
    },

    async logout() {
        try {
            await api.post('/auth/logout');
        } finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
        }
    },

    async getMe() {
        const response = await api.get('/auth/me');
        return response.data.data.user;
    },

    async forgotPassword(email: string) {
        const response = await api.post('/auth/forgot-password', { email });
        return response.data;
    },

    async resetPassword(token: string, password: string) {
        const response = await api.post('/auth/reset-password', { token, password });
        return response.data;
    },

    async verifyEmail(token: string) {
        const response = await api.post('/auth/verify-email', { token });
        return response.data;
    },

    async enable2FA() {
        const response = await api.post('/auth/2fa/enable');
        return response.data.data;
    },

    async confirm2FA(code: string) {
        const response = await api.post('/auth/2fa/confirm', { code });
        return response.data;
    },

    async disable2FA(code: string) {
        const response = await api.post('/auth/2fa/disable', { code });
        return response.data;
    },
};
