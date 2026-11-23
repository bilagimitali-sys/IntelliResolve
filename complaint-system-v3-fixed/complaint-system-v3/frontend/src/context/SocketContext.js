import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user }  = useAuth();
  const socketRef = useRef(null);
  const [newComplaintAlert, setNewComplaintAlert] = useState(null);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Determine backend host dynamically
    const socketHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : window.location.origin;

    const socket = io(socketHost, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    // Join personal notification channel
    socket.emit('join', user.user_id);

    // Join role channel
    if (user.role) {
      socket.emit('joinRole', user.role);
    }

    // Join department channel if assigned
    if (user.department_id) {
      socket.emit('joinDept', user.department_id);
    }

    // Real-time alerts
    socket.on('newComplaint', (data) => {
      setNewComplaintAlert(data);
      setTimeout(() => setNewComplaintAlert(null), 10000);
    });

    socket.on('newBusComplaint', (data) => {
      setNewComplaintAlert(data);
      setTimeout(() => setNewComplaintAlert(null), 10000);
    });

    socket.on('newEscalation', (data) => {
      setNewComplaintAlert({
        title: `URGENT ESCALATION: ${data.reason}`,
        bus_complaint_id: data.bus_complaint_id,
        is_safety_hazard: true,
      });
      setTimeout(() => setNewComplaintAlert(null), 12000);
    });

    socket.on('notification', (data) => {
      // Trigger a brief toast notification if desirable
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const clearAlert = () => setNewComplaintAlert(null);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, newComplaintAlert, clearAlert }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
