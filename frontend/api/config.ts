import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const INVALID_TOKEN_VALUES = new Set(['null', 'undefined', '']);

export const sanitizeToken = (rawToken?: string | null) => {
  if (!rawToken) {
    return null;
  }

  const token = rawToken.trim();
  if (!token) {
    return null;
  }

  const normalized = token.toLowerCase();
  if (INVALID_TOKEN_VALUES.has(normalized)) {
    return null;
  }

  return token.startsWith('Bearer ') ? token.slice(7).trim() : token;
};

const DEFAULT_API_BASE_URL = 'http://192.168.1.171:8080/api';
const hostUri = Constants.expoConfig?.hostUri;
const localHost = hostUri?.split(':')[0];

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (localHost ? `http://${localHost}:8080/api` : DEFAULT_API_BASE_URL);

export const WS_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

const api = axios.create({
    baseURL: API_BASE_URL,
});

api.interceptors.request.use(
    async (config) => {
        const storedToken = await SecureStore.getItemAsync('token');
        const token = sanitizeToken(storedToken);

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else if (storedToken) {
            await SecureStore.deleteItemAsync('token');
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;