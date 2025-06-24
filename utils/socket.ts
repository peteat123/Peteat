// @ts-ignore - types may not be available in mobile environment
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Key used in api.ts as well – keep in sync
const AUTH_TOKEN_KEY = 'peteat_auth_token';

// Resolve base URL similar to api.ts
const ENV_BASE_URL = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl;
const DEV_IP = process.env.EXPO_PUBLIC_DEV_IP || Constants.expoConfig?.extra?.devIp || '192.168.68.101';

let SOCKET_BASE_URL = ENV_BASE_URL ? ENV_BASE_URL.replace(/\/api$/, '') : undefined;
if (!SOCKET_BASE_URL) {
  if (Platform.OS === 'android') {
    SOCKET_BASE_URL = `http://${DEV_IP || '10.0.2.2'}:5000`;
  } else {
    SOCKET_BASE_URL = 'http://localhost:5000';
  }
}

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 1000;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

// Socket connection status
export enum SocketConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  ERROR = 'error'
}

// Current connection status
let connectionStatus: SocketConnectionStatus = SocketConnectionStatus.DISCONNECTED;

// Socket event listeners with proper type definitions
interface SocketEventListener {
  event: string;
  callback: (...args: any[]) => void;
  id: string; // Unique ID to prevent duplicate listeners
}

const socketEventListeners: SocketEventListener[] = [];

// Generate a unique ID for event listeners
const generateListenerId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

// Get current socket connection status
export const getConnectionStatus = (): SocketConnectionStatus => {
  return connectionStatus;
};

// Initialize socket with token
export const initializeSocket = async (): Promise<Socket | null> => {
  try {
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    if (!token) {
      connectionStatus = SocketConnectionStatus.ERROR;
      throw new Error('Cannot initialize socket – user not authenticated');
    }

    // Clean up previous socket if it exists
    if (socket) {
      cleanupSocket();
    }

    connectionStatus = SocketConnectionStatus.CONNECTING;
    
    socket = io(SOCKET_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: RECONNECT_INTERVAL,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      timeout: 10000,
    });

    // Set up event handlers for socket connection
    socket.on('connect', () => {
      console.log('Socket connected');
      connectionStatus = SocketConnectionStatus.CONNECTED;
      reconnectAttempts = 0; // Reset reconnect attempts on successful connection
      
      // Clear any pending reconnect timers
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      
      // Re-apply all event listeners
      reapplyEventListeners();
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${reason}`);
      connectionStatus = SocketConnectionStatus.DISCONNECTED;
      
      // If the disconnection wasn't initiated by the client, attempt to reconnect
      if (reason === 'io server disconnect' || reason === 'transport close') {
        attemptReconnect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      connectionStatus = SocketConnectionStatus.ERROR;
      
      attemptReconnect();
    });

    return socket;
  } catch (error) {
    console.error('Socket initialization error:', error);
    connectionStatus = SocketConnectionStatus.ERROR;
    return null;
  }
};

// Attempt to reconnect with exponential backoff
const attemptReconnect = () => {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('Max reconnection attempts reached, giving up');
    connectionStatus = SocketConnectionStatus.ERROR;
    cleanupSocket();
    return;
  }
  
  reconnectAttempts++;
  
  // Clear any existing reconnect timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s
  const delay = RECONNECT_INTERVAL * Math.pow(2, reconnectAttempts - 1);
  console.log(`Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
  
  reconnectTimer = setTimeout(async () => {
    if (connectionStatus === SocketConnectionStatus.DISCONNECTED || 
        connectionStatus === SocketConnectionStatus.ERROR) {
      await initializeSocket();
    }
  }, delay);
};

// Get socket instance, initializing if needed
export const getSocket = async (): Promise<Socket> => {
  if (socket && socket.connected) {
    return socket;
  }
  
  // If socket exists but is disconnected, try to reconnect
  if (socket && !socket.connected) {
    connectionStatus = SocketConnectionStatus.CONNECTING;
    socket.connect();
    
    // Return a promise that resolves when connected or rejects after timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Socket connection timeout'));
      }, 5000);
      
      socket!.once('connect', () => {
        clearTimeout(timeout);
        resolve(socket!);
      });
      
      socket!.once('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }
  
  // Initialize new socket
  const newSocket = await initializeSocket();
  if (!newSocket) {
    throw new Error('Failed to initialize socket connection');
  }
  
  return newSocket;
};

// Add event listener with duplicate prevention
export const addSocketListener = (event: string, callback: (...args: any[]) => void): string => {
  // Generate a unique ID for this listener
  const listenerId = generateListenerId();
  
  // Store the callback for reconnection scenarios
  socketEventListeners.push({
    event,
    callback,
    id: listenerId
  });
  
  // If socket exists, add listener immediately
  if (socket) {
    socket.on(event, callback);
  }
  
  return listenerId;
};

// Remove specific event listener by ID
export const removeSocketListenerById = (listenerId: string): boolean => {
  const index = socketEventListeners.findIndex(listener => listener.id === listenerId);
  
  if (index !== -1) {
    const { event, callback } = socketEventListeners[index];
    socketEventListeners.splice(index, 1);
    
    if (socket) {
      socket.off(event, callback);
    }
    
    return true;
  }
  
  return false;
};

// Remove event listener(s)
export const removeSocketListener = (event: string, callback?: Function): void => {
  if (socket && event) {
    if (callback) {
      socket.off(event, callback as any);
      
      // Also remove from stored listeners
      const index = socketEventListeners.findIndex(
        listener => listener.event === event && listener.callback === callback
      );
      
      if (index !== -1) {
        socketEventListeners.splice(index, 1);
      }
    } else {
      // Remove all listeners for this event
      socket.off(event);
      
      // Remove all stored listeners for this event
      const filteredListeners = socketEventListeners.filter(
        listener => listener.event !== event
      );
      
      socketEventListeners.length = 0;
      socketEventListeners.push(...filteredListeners);
    }
  }
};

// Reapply all event listeners (used after reconnection)
const reapplyEventListeners = (): void => {
  if (!socket) return;
  
  // Clear all existing listeners first to prevent duplicates
  socket.removeAllListeners();
  
  // Re-add core connection listeners
  socket.on('connect', () => {
    console.log('Socket connected');
    connectionStatus = SocketConnectionStatus.CONNECTED;
    reconnectAttempts = 0;
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${reason}`);
    connectionStatus = SocketConnectionStatus.DISCONNECTED;
    
    if (reason === 'io server disconnect' || reason === 'transport close') {
      attemptReconnect();
    }
  });
  
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    connectionStatus = SocketConnectionStatus.ERROR;
    attemptReconnect();
  });
  
  // Re-add all custom event listeners
  socketEventListeners.forEach(({ event, callback }) => {
    socket!.on(event, callback);
  });
};

// Clean up socket resources
const cleanupSocket = (): void => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  connectionStatus = SocketConnectionStatus.DISCONNECTED;
};

// Disconnect socket
export const disconnectSocket = (): void => {
  cleanupSocket();
}; 