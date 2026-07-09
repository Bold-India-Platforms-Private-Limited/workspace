import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_BASEURL || 'http://localhost:5000';

let socket = null;

export const getSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: false,
            transports: ['websocket', 'polling'],
        });
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

// Peek at connection state without creating a socket instance as a side effect.
export const isSocketConnected = () => Boolean(socket?.connected);
