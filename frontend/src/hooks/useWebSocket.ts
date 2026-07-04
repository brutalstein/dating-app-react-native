/**
 * useWebSocket Hook
 * 
 * Real-time WebSocket connection for live updates.
 * Handles reconnection, subscription management, and message routing.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Client, IMessage, IFrame } from '@stomp/stompjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const WS_TOKEN_KEY = '@bloom_ws_token';
const RECONNECT_DELAY_MS = 5000;
const MAX_RECONNECT_ATTEMPTS = 10;

type MessageHandler = (data: any) => void;

interface Subscription {
  topic: string;
  handler: MessageHandler;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribe: (topic: string, handler: MessageHandler) => void;
  unsubscribe: (topic: string) => void;
  publish: (destination: string, message: any) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  
  const clientRef = useRef<Client | null>(null);
  const subscriptionsRef = useRef<Map<string, Subscription>>(new Map());
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const isMountedRef = useRef(true);
  
  /**
   * Get WebSocket URL from environment or constants
   */
  const getWebSocketUrl = useCallback(() => {
    // In production, this should come from environment config
    const apiUrl = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8080';
    const wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    return `${wsUrl}/ws`;
  }, []);
  
  /**
   * Get authentication token
   */
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(WS_TOKEN_KEY);
    } catch (err) {
      console.error('Error getting auth token:', err);
      return null;
    }
  }, []);
  
  /**
   * Initialize WebSocket client
   */
  const initializeClient = useCallback(async () => {
    if (clientRef.current) {
      return;
    }
    
    const token = await getAuthToken();
    if (!token) {
      console.log('No auth token available for WebSocket');
      return;
    }
    
    const wsUrl = getWebSocketUrl();
    
    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: RECONNECT_DELAY_MS,
      connectionTimeout: 10000,
      debug: (str: string) => {
        console.debug('[WebSocket]', str);
      },
      onConnect: (frame: IFrame) => {
        console.log('WebSocket connected');
        reconnectAttemptsRef.current = 0;
        
        if (isMountedRef.current) {
          setIsConnected(true);
        }
        
        // Re-subscribe to all topics
        subscriptionsRef.current.forEach((subscription, topic) => {
          client.subscribe(`/topic/${topic}`, (message: IMessage) => {
            try {
              const data = JSON.parse(message.body);
              subscription.handler(data);
            } catch (err) {
              console.error('Error parsing WebSocket message:', err);
            }
          });
        });
      },
      onDisconnect: () => {
        console.log('WebSocket disconnected');
        if (isMountedRef.current) {
          setIsConnected(false);
        }
      },
      onError: (error: any) => {
        console.error('WebSocket error:', error);
      },
      onStompError: (frame: IFrame) => {
        console.error('STOMP error:', frame.headers['message']);
      },
    });
    
    // Add authorization header
    client.beforeConnect = async () => {
      const token = await getAuthToken();
      if (token) {
        client.wsWrapper?.headers?.set('Authorization', `Bearer ${token}`);
      }
    };
    
    clientRef.current = client;
  }, [getAuthToken, getWebSocketUrl]);
  
  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(async () => {
    if (isConnectingRef.current || isConnected) {
      return;
    }
    
    isConnectingRef.current = true;
    
    try {
      await initializeClient();
      
      if (clientRef.current && !clientRef.current.active) {
        clientRef.current.activate();
      }
    } catch (err) {
      console.error('Error connecting to WebSocket:', err);
      isConnectingRef.current = false;
      
      // Retry with exponential backoff
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++;
        setTimeout(connect, RECONNECT_DELAY_MS * reconnectAttemptsRef.current);
      }
    }
  }, [initializeClient, isConnected]);
  
  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
    }
    
    subscriptionsRef.current.clear();
    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []);
  
  /**
   * Subscribe to a topic
   */
  const subscribe = useCallback((topic: string, handler: MessageHandler) => {
    // Store subscription
    subscriptionsRef.current.set(topic, { topic, handler });
    
    // Subscribe if connected
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.subscribe(`/topic/${topic}`, (message: IMessage) => {
        try {
          const data = JSON.parse(message.body);
          handler(data);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      });
      
      console.log(`Subscribed to /topic/${topic}`);
    }
  }, []);
  
  /**
   * Unsubscribe from a topic
   */
  const unsubscribe = useCallback((topic: string) => {
    // Remove from subscriptions
    subscriptionsRef.current.delete(topic);
    
    // Unsubscribe if connected
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.unsubscribe(`/topic/${topic}`);
      console.log(`Unsubscribed from /topic/${topic}`);
    }
  }, []);
  
  /**
   * Publish a message to a destination
   */
  const publish = useCallback((destination: string, message: any) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish({
        destination,
        body: JSON.stringify(message),
      });
    } else {
      console.warn('Cannot publish: WebSocket not connected');
    }
  }, []);
  
  /**
   * Initial connection setup
   */
  useEffect(() => {
    isMountedRef.current = true;
    
    // Auto-connect when token is available
    connect();
    
    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, []);
  
  return {
    isConnected,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    publish,
  };
}
