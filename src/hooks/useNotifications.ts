import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface NotificationItem {
  id: string;
  type: 'channel' | 'conversation';
  title: string;
  message: string;
  unreadCount: number;
  timestamp: string;
  channelId?: string;
  conversationId?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
}

export interface NotificationSettings {
  pushNotifications: boolean;
  messageNotifications: boolean;
}

export const useNotifications = (settings?: NotificationSettings) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Default settings if not provided
  const defaultSettings: NotificationSettings = {
    pushNotifications: true,
    messageNotifications: true,
  };

  const activeSettings = settings || defaultSettings;

  const { data: channelNotifications = [], isLoading: loadingChannels } = useQuery({
    queryKey: ['channelNotifications', user?.id],
    queryFn: async () => {
      if (!user || !activeSettings.messageNotifications) return [];

      try {
        // Get user's channels
        const { data: membershipData, error: membershipError } = await supabase
          .from('channel_members')
          .select('channel_id, role')
          .eq('user_id', user.id);

        if (membershipError) throw membershipError;

        const userChannelIds = membershipData?.map(m => m.channel_id) || [];
        if (userChannelIds.length === 0) return [];

        // Get channel details
        const { data: channelsData, error: channelsError } = await supabase
          .from('channels')
          .select('*')
          .in('id', userChannelIds);

        if (channelsError) throw channelsError;

        // Calculate unread messages for each channel
        const channelNotifications = await Promise.all(
          (channelsData || []).map(async (channel) => {
            try {
              const lastVisitKey = `channel_${channel.id}_last_visit_${user.id}`;
              const lastVisit = localStorage.getItem(lastVisitKey);
              const lastVisitTime = lastVisit ? new Date(lastVisit) : new Date(Date.now() - 24 * 60 * 60 * 1000);

              // Count unread messages
              const { count: unreadCount } = await supabase
                .from('channel_messages')
                .select('*', { count: 'exact', head: true })
                .eq('channel_id', channel.id)
                .neq('sender_id', user.id)
                .gt('created_at', lastVisitTime.toISOString());

              if ((unreadCount || 0) > 0) {
                // Get the latest message for preview
                const { data: latestMessage } = await supabase
                  .from('channel_messages')
                  .select('content, created_at, sender_id')
                  .eq('channel_id', channel.id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();

                return {
                  id: `channel_${channel.id}`,
                  type: 'channel' as const,
                  title: channel.name,
                  message: latestMessage?.content || 'New messages',
                  unreadCount: unreadCount || 0,
                  timestamp: latestMessage?.created_at || new Date().toISOString(),
                  channelId: channel.id,
                };
              }
            } catch (error) {
              console.error('Error calculating unread count for channel', channel.name, ':', error);
            }
            return null;
          })
        );

        return channelNotifications.filter(n => n !== null) as NotificationItem[];
      } catch (error) {
        console.error('Error fetching channel notifications:', error);
        return [];
      }
    },
    enabled: !!user && activeSettings.messageNotifications,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: conversationNotifications = [], isLoading: loadingConversations } = useQuery({
    queryKey: ['conversationNotifications', user?.id],
    queryFn: async () => {
      if (!user || !activeSettings.messageNotifications) return [];

      try {
        // Get user's conversations
        const { data: conversationsData, error: conversationsError } = await supabase
          .from('conversations')
          .select('*')
          .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`);

        if (conversationsError) throw conversationsError;

        // Calculate unread messages for each conversation
        const conversationNotifications = await Promise.all(
          (conversationsData || []).map(async (conv) => {
            try {
              const otherUserId = conv.participant1_id === user.id ? conv.participant2_id : conv.participant1_id;
              const lastVisitKey = `conversation_${otherUserId}_last_visit_${user.id}`;
              const lastVisit = localStorage.getItem(lastVisitKey);
              const lastVisitTime = lastVisit ? new Date(lastVisit) : new Date(Date.now() - 24 * 60 * 60 * 1000);

              // Count unread messages
              const { count: unreadCount } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('conversation_id', conv.id)
                .neq('sender_id', user.id)
                .gt('created_at', lastVisitTime.toISOString());

              if ((unreadCount || 0) > 0) {
                // Get user profile
                const { data: profile } = await supabase
                  .from('user_profiles')
                  .select('full_name, avatar_url')
                  .eq('user_id', otherUserId)
                  .maybeSingle();

                // Get latest message
                const { data: latestMessage } = await supabase
                  .from('messages')
                  .select('content, created_at')
                  .eq('conversation_id', conv.id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();

                return {
                  id: `conversation_${otherUserId}`,
                  type: 'conversation' as const,
                  title: profile?.full_name || 'User',
                  message: latestMessage?.content || 'New message',
                  unreadCount: unreadCount || 0,
                  timestamp: latestMessage?.created_at || new Date().toISOString(),
                  conversationId: conv.id,
                  userId: otherUserId,
                  userName: profile?.full_name || 'User',
                  userAvatar: profile?.avatar_url,
                };
              }
            } catch (error) {
              console.error('Error calculating unread count for conversation:', error);
            }
            return null;
          })
        );

        return conversationNotifications.filter(n => n !== null) as NotificationItem[];
      } catch (error) {
        console.error('Error fetching conversation notifications:', error);
        return [];
      }
    },
    enabled: !!user && activeSettings.messageNotifications,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  useEffect(() => {
    if (!loadingChannels && !loadingConversations) {
      const allNotifications = [...channelNotifications, ...conversationNotifications]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setNotifications(allNotifications);
    }
  }, [channelNotifications, conversationNotifications, loadingChannels, loadingConversations]);

  const markAsRead = (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification || !user) return;

    if (notification.type === 'channel' && notification.channelId) {
      const lastVisitKey = `channel_${notification.channelId}_last_visit_${user.id}`;
      localStorage.setItem(lastVisitKey, new Date().toISOString());
    } else if (notification.type === 'conversation' && notification.userId) {
      const lastVisitKey = `conversation_${notification.userId}_last_visit_${user.id}`;
      localStorage.setItem(lastVisitKey, new Date().toISOString());
    }

    // Remove the notification from the list
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const markAllAsRead = () => {
    if (!user) return;

    notifications.forEach(notification => {
      if (notification.type === 'channel' && notification.channelId) {
        const lastVisitKey = `channel_${notification.channelId}_last_visit_${user.id}`;
        localStorage.setItem(lastVisitKey, new Date().toISOString());
      } else if (notification.type === 'conversation' && notification.userId) {
        const lastVisitKey = `conversation_${notification.userId}_last_visit_${user.id}`;
        localStorage.setItem(lastVisitKey, new Date().toISOString());
      }
    });

    setNotifications([]);
  };

  const totalUnreadCount = notifications.reduce((total, notification) => total + notification.unreadCount, 0);

  return {
    notifications,
    totalUnreadCount,
    isLoading: loadingChannels || loadingConversations,
    markAsRead,
    markAllAsRead,
  };
};