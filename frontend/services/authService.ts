import api, { sanitizeToken } from "@/api/config";
import * as SecureStore from 'expo-secure-store';

export interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface AuthResponse {
  message?: string;
  token?: string;
}

const getErrorMessage = (error: any, fallback: string) => {
  const responseData = error?.response?.data;

  if (typeof responseData === 'string') {
    return responseData;
  }

  if (responseData?.message) {
    return responseData.message;
  }

  if (error?.message) {
    return error.message;
  }

  return fallback;
};

const toAuthResponse = (data: any): AuthResponse => {
  if (typeof data === 'string') {
    return { message: data };
  }

  return data || {};
};

export const authService = {
    verifyOtp: async (email: string, code: string) => {
        try {
            const res = await api.post("/auth/verify", { email, code });
            const data = toAuthResponse(res.data);

            const token = sanitizeToken(data.token);
            if (token) {
                await SecureStore.setItemAsync('token', token);
            }

            return data;
        }
        catch (error: any) {
            throw new Error(getErrorMessage(error, "An error occurred while verifying your email."));
        }
    },
    resendOtp: async (email: string) => {
        try {
            const res = await api.post("/auth/resend-code", { email });
            return toAuthResponse(res.data);
        }
        catch (error: any) {
            throw new Error(getErrorMessage(error, "An error occurred while resending the verification code."));
        }
    },
    register: async (userData: UserData) => {
        try {
            const res = await api.post("/auth/register", userData);
            return toAuthResponse(res.data);
        }
        catch (error: any) {
            throw new Error(getErrorMessage(error, "An error occurred during registration."));
        }
    },
    login: async (email: string, password: string) => {
        try {
            const res = await api.post("/auth/login", { email, password });
            const data = toAuthResponse(res.data);

            const token = sanitizeToken(data.token);
            if (token) {
                await SecureStore.setItemAsync('token', token);
            }

            return data;
        }
        catch (error: any) {
            throw new Error(getErrorMessage(error, "An error occurred during login."));
        }
    },
    logout: async () => {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('profile_avatar_uri');
      const keys = ['profile_avatar_uri', 'profile_avatar_uri_v1'];
      for (const key of keys) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch {
          // no-op
        }
      }
    }
};