import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import type { AssignmentNotification } from '../types';

interface NotificationsContextType {
  notifications: AssignmentNotification[];
  unreadCount: number;
  pendingCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  confirm: (id: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  pendingCount: 0,
  loading: false,
  refreshNotifications: async () => { },
  markRead: async () => { },
  markAllRead: async () => { },
  confirm: async () => { },
});

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AssignmentNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const initialToastShownRef = useRef(false);

  const refreshNotifications = async () => {
    if (!user?.member_id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const rows = await api.getMyAssignmentNotifications(user.member_id);
      setNotifications(rows);

      if (!initialToastShownRef.current && rows.some(notification => !notification.isRead)) {
        toast.info('Você recebeu uma nova designação.');
        initialToastShownRef.current = true;
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initialToastShownRef.current = false;
    refreshNotifications();
  }, [user?.member_id]);

  useEffect(() => {
    if (!user?.member_id) {
      return;
    }

    const channel = supabase
      .channel(`member-assignment-notifications:${user.member_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'member_assignment_notifications',
          filter: `member_id=eq.${user.member_id}`,
        },
        payload => {
          if ((payload.new as any)?.status !== 'revoked') {
            toast.info('Você recebeu uma nova designação.');
          }
          refreshNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'member_assignment_notifications',
          filter: `member_id=eq.${user.member_id}`,
        },
        () => {
          refreshNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.member_id]);

  const markRead = async (id: string) => {
    await api.markAssignmentNotificationRead(id);
    await refreshNotifications();
  };

  const markAllRead = async () => {
    if (!user?.member_id) {
      return;
    }

    await api.markAllAssignmentNotificationsRead(user.member_id);
    await refreshNotifications();
  };

  const confirm = async (id: string) => {
    await api.confirmAssignmentNotification(id);
    await refreshNotifications();
  };

  const value = {
    notifications,
    unreadCount: notifications.filter(notification => !notification.isRead).length,
    pendingCount: notifications.filter(notification => notification.status === 'pending_confirmation').length,
    loading,
    refreshNotifications,
    markRead,
    markAllRead,
    confirm,
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export const useNotifications = () => useContext(NotificationsContext);
