import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    companyId?: string;
    companyName?: string;
    avatar?: string;
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    isHydrated: boolean;
    rememberMe: boolean;
    setAuth: (user: User, token: string, rememberMe?: boolean) => void;
    logout: () => void;
    updateUser: (user: Partial<User>) => void;
    setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isHydrated: false,
            rememberMe: true, // Default to true

            setAuth: (user, token, rememberMe = true) => {
                set({ user, accessToken: token, isAuthenticated: true, rememberMe });
            },

            logout: () => {
                set({ user: null, accessToken: null, isAuthenticated: false });
            },

            updateUser: (userData) => {
                set((state) => ({
                    user: state.user ? { ...state.user, ...userData } : null,
                }));
            },

            setHydrated: () => {
                set({ isHydrated: true });
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => {
                // Custom storage to handle Remember Me logic
                if (typeof window !== 'undefined') {
                    return {
                        getItem: (name: string) => {
                            try {
                                return sessionStorage.getItem(name) || localStorage.getItem(name);
                            } catch (e) {
                                return null;
                            }
                        },
                        setItem: (name: string, value: string) => {
                            try {
                                const parsed = JSON.parse(value);
                                // Default to TRUE if undefined (safe migration & fallback)
                                const shouldRemember = parsed.state?.rememberMe ?? true;

                                if (shouldRemember) {
                                    localStorage.setItem(name, value);
                                    try { sessionStorage.removeItem(name); } catch (e) { }
                                } else {
                                    sessionStorage.setItem(name, value);
                                    try { localStorage.removeItem(name); } catch (e) { }
                                }
                            } catch (e) {
                                // Fallback to localStorage if parsing/logic fails
                                try { localStorage.setItem(name, value); } catch (err) { }
                            }
                        },
                        removeItem: (name: string) => {
                            try { sessionStorage.removeItem(name); } catch (e) { }
                            try { localStorage.removeItem(name); } catch (e) { }
                        },
                    };
                }
                return {
                    getItem: () => null,
                    setItem: () => { },
                    removeItem: () => { },
                };
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHydrated();
            },
            // Persist all auth data including the token
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                isAuthenticated: state.isAuthenticated,
                rememberMe: state.rememberMe,
            }),
        }
    )
);
