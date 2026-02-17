import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { captureException } from '@/services/monitoring';

const INVALID_TOKEN_VALUES = new Set(['null', 'undefined', '']);
const MONITOR_THROTTLE_MS = 60 * 1000;
const monitorBuckets = new Map<string, number>();

const isExploreHubPath = (url: string) => url.includes('/explore-hub');

export const sanitizeToken = (rawToken?: string | null) => {
  if (!rawToken) {
    return null;
  }

  const token = rawToken.trim();
  if (!token) {
    return null;
  }

  const withoutBearer = token.replace(/^bearer\s+/i, '').trim();
  if (!withoutBearer) {
    return null;
  }

  const normalized = withoutBearer.toLowerCase();
  if (INVALID_TOKEN_VALUES.has(normalized)) {
    return null;
  }

  return withoutBearer;
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
    captureException(error, { scope: 'http_request_interceptor' });
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const method = String(error?.config?.method || 'get').toUpperCase();
    const url = String(error?.config?.url || 'unknown');
    const status = Number(error?.response?.status || 0);

    const isExpectedExploreHubThrottle = status === 429 && method === 'GET' && isExploreHubPath(url);
    const shouldSuppress429Noise = status === 429;
    const bucketKey = `${method}:${url}:${status}`;
    const now = Date.now();
    const lastSentAt = monitorBuckets.get(bucketKey) || 0;
    const shouldCapture = !isExpectedExploreHubThrottle && (!shouldSuppress429Noise || now - lastSentAt > MONITOR_THROTTLE_MS);

    if (shouldCapture) {
      monitorBuckets.set(bucketKey, now);
      captureException(error, {
        scope: 'http_response_interceptor',
        method,
        url,
        status,
      });
    }

    return Promise.reject(error);
  }
);

export default api;
