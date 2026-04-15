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
