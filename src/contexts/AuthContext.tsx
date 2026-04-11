// src/contexts/AuthContext.tsx
import axios from "axios";
import { useRouter } from "expo-router";
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import AsyncStorage from '../utils/storage';

const joinUrl = (base: string, path: string) =>
    `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

const getAuthEndpointCandidates = (baseUrl: string, path: string) => {
    const normalized = baseUrl.replace(/\/+$/, '');
    const withoutApi = normalized.replace(/\/api$/i, '');
    const urls = [joinUrl(withoutApi, path)];
    return urls;
};
// Define the User interface
export interface User {
    id: string;
    username: string;
    token?: string;
    role: string;
    subscription?: boolean;
    isVerified?: boolean;
}
interface AuthState {
    isLoggedIn: boolean;
    user: User | null;
    isLoading: boolean;
}
interface AuthContextType extends AuthState {
    signIn: (username: string, password: string) => Promise<User>;
    signOut: () => Promise<void>;
    setState: React.Dispatch<React.SetStateAction<AuthState>>;
}

const AuthContext = createContext<AuthContextType | null>(null);
// Update the AuthProvider component
const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [state, setState] = useState<AuthState>({
        isLoggedIn: false,
        user: null,
        isLoading: true,
    });
    const router = useRouter();

    // Load stored auth data on initial render
    useEffect(() => {
        const loadAuthData = async () => {
            try {
                const jsonValue = await AsyncStorage.getItem('@authData');
                if (jsonValue) {
                    const { user, isLoggedIn } = JSON.parse(jsonValue);
                    setState({
                        isLoggedIn,
                        user,
                        isLoading: false,
                    });
                } else {
                    setState(prev => ({ ...prev, isLoading: false }));
                }
            } catch (error) {
                console.error('Failed to load auth data', error);
                setState(prev => ({ ...prev, isLoading: false }));
            }
        };

        loadAuthData();
    }, []);

    const signIn = async (username: string, password: string, navigation?: any) => {
        try {

            const location = await AsyncStorage.getItem('@selectedLocation');
            
            if (!location) {
                throw new Error('No location selected');
            }

            const { baseUrl } = JSON.parse(location);
            const sanitizedBaseUrl = String(baseUrl || '').replace(/\/+$/, '').replace(/\/api$/i, '');

            type LoginResponse = {
                status: boolean;
                message?: string;
                otp?: string;
                user?: {
                    id: string;
                    username: string;
                    role: string;
                    subscription: boolean;
                    fullName?: string;
                };
            };
            console.log("=== LOGIN DEBUG START ===");
            console.log("baseUrl", sanitizedBaseUrl);
            
            const endpointCandidates = getAuthEndpointCandidates(sanitizedBaseUrl, 'user/login/mobile');
            console.log("endpointCandidates", endpointCandidates);
            let response: { data: LoginResponse; headers: any } | null = null;
            let lastError: unknown = null;

            for (const endpoint of endpointCandidates) {
                try {
                    console.log("Trying endpoint:", endpoint);
                    response = await axios.post<LoginResponse>(
                        endpoint,
                        { username, password },
                        {
                            timeout: 15000,
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            }
                        }
                    );
                    console.log("Success! Response:", response.data);
                    break;
                } catch (err: any) {
                    console.log("Endpoint failed:", endpoint, err.message);
                    lastError = err;
                    if (err?.response?.status === 404) {
                        continue;
                    }
                    throw err;
                }
            }

            if (!response) {
                throw lastError || new Error('Login endpoint not found');
            }

            // Handle the case where status is false but we have a user (e.g., subscription required)
            if (response.data?.status === false && response.data?.user) {
                console.log("User exists but subscription check failed, proceeding with user data");
                // We'll continue with the user data even if status is false
            } else if (response.data?.status === false) {
                // If status is false and no user data, throw an error
                throw new Error(response.data.message || 'Login failed');
            }
            
            if (!response.data?.user) {
                throw new Error('Invalid response from server');
            }

            const userData = response.data.user;
            const user: User = {
                id: userData.id,
                username: userData.username,
                role: userData.role || 'INMATE',
                token: response.headers['authorization'] || response.headers['Authorization'],
                subscription: userData.subscription,
                isVerified: true
            };

            if (!user.token) {
                console.warn('No authentication token found in response headers');
            }

            // Store user data without setting isLoggedIn to true yet
            const authData = {
                isLoggedIn: true, // Set to true since we're handling OTP separately
                user,
            };

            await AsyncStorage.setItem('@authData', JSON.stringify(authData));

            // Update state
            setState({
                isLoggedIn: true,
                user,
                isLoading: false,
            });

            // Store OTP if available
            console.log(response?.data);

            if (response.data.otp) {
                console.log("Storing OTP...");
                await AsyncStorage.setItem('@otp', response.data.otp);
                await AsyncStorage.setItem('@username', userData?.username || '');
                router.replace('/otp'); // Use router instead of navigation
            } else if (user.subscription !== true) {
                router.replace('/subscription');
            } else {
                router.replace('/(tabs)/profile');
            }

            return user;
        } catch (error: unknown) {
            const axiosError = error as {
                message: string;
                code?: string;
                response?: {
                    status: number;
                    data?: {
                        message?: string;
                    };
                };
                config?: {
                    url?: string;
                    method?: string;
                    data?: string;
                };
            };

            console.log('Login error details:', {
                message: axiosError.message,
                response: axiosError.response?.data,
                code: axiosError.code,
                config: {
                    url: axiosError.config?.url,
                    method: axiosError.config?.method,
                    data: axiosError.config?.data
                }
            });

            let errorMessage = 'Login failed. Please try again.';
            if (axiosError.code === 'ECONNABORTED') {
                errorMessage = 'Connection timeout. Please check your internet connection.';
            } else if (axiosError.response?.status === 502) {
                errorMessage = 'Server is currently unavailable. Please try again later.';
            } else if (axiosError.response?.data?.message) {
                errorMessage = axiosError.response.data.message;
            }

            throw new Error(errorMessage);
        }
    };

    const signOut = async () => {
        try {
            await AsyncStorage.removeItem('@authData');
            setState({
                isLoggedIn: false,
                user: null,
                isLoading: false,
            });
        } catch (error) {
            console.error('Failed to sign out', error);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                ...state,
                signIn,
                signOut,
                setState
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

// Update the useAuth hook to include the new types
const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === null || context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export { AuthContext, AuthProvider, useAuth };


