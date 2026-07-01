import { useEffect, useRef } from 'react';
import { getSocket } from '../services/socket';

/**
 * Hook to listen to socket events with automatic cleanup
 */
export const useSocketEvent = (event, handler) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const listener = (...args) => handlerRef.current(...args);
    socket.on(event, listener);

    return () => {
      socket.off(event, listener);
    };
  }, [event]);
};

/**
 * Hook to emit a socket event
 */
export const useSocketEmit = () => {
  const emit = (event, data) => {
    const socket = getSocket();
    if (socket) {
      socket.emit(event, data);
    }
  };
  return emit;
};
