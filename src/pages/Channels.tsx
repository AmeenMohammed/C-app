import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Globe, MapPin, ExternalLink, Users, Send, Smile, Search, Paperclip, X, Plus, Settings, Info, Edit3, Trash2, MoreVertical } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import EmojiPicker from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { moderateText, validateAndModerateFile } from "@/utils/contentModeration";
import { MessageReactions } from "@/components/MessageReactions";

interface MessageAttachment {
  type: "image" | "video" | "file";
  url: string;
  name?: string;
}

interface Message {
  id: string;
  text: string;
  isMine: boolean;
  sender_id: string;
  user?: {
    name: string;
    avatar?: string;
  };
  attachment?: MessageAttachment;
  timestamp?: string;
}

interface JoinRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  requested_at: string;
  user: {
    name: string;
    avatar?: string;
  };
}

interface Channel {
  id: string;
  name: string;
  description: string;
  members: number;
  isPrivate: boolean;
  isJoined?: boolean;
  unreadCount?: number;
  messages?: Message[];
  creator_id: string;
  created_at: string;
  updated_at: string;
  userRole?: 'owner' | 'admin' | 'member';
  joinRequests?: JoinRequest[];
  hasRequestPending?: boolean;
}

const Channels = () => {
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [discoverSearchQuery, setDiscoverSearchQuery] = useState("");
  const [joinedSearchQuery, setJoinedSearchQuery] = useState("");
  const [range, setRange] = useState([5]); // Default 5km radius
  const [debouncedRange, setDebouncedRange] = useState([5]); // Debounced version for API calls
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", isPrivate: false });
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user's saved location from profile if authenticated (same as ItemGrid)
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('latitude, longitude')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.log('No saved location found in profile');
        return null;
      }

      return data;
    },
    enabled: !!user,
  });

  // Stabilize effectiveUserLocation using useMemo to prevent re-render loops
  const effectiveUserLocation = useMemo(() => {
    if (userProfile?.latitude && userProfile?.longitude) {
      return { lat: userProfile.latitude, lng: userProfile.longitude };
    }
    return userLocation;
  }, [userProfile?.latitude, userProfile?.longitude, userLocation]);

  // Get user's location on component mount (same as Home.tsx - run once)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []); // Empty dependency array - run only once on mount

  // Debounce the range value to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedRange(range);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [range]);

  // Fetch channels using useQuery instead of useEffect to prevent loops
  const { data: channels = [], isLoading: loading, error: channelsError } = useQuery({
    queryKey: ['channels', user?.id, effectiveUserLocation?.lat, effectiveUserLocation?.lng, debouncedRange[0]],
    queryFn: async () => {
      if (!user) return [];

      try {
        // Get user's channel memberships first
        const { data: membershipsData, error: membershipsError } = await supabase
          .from('channel_members')
          .select('channel_id, role')
          .eq('user_id', user.id);

        if (membershipsError) throw membershipsError;

        const userChannelIds = new Set(membershipsData.map(m => m.channel_id));
        const userChannelRoles = new Map(membershipsData.map(m => [m.channel_id, m.role]));

        // Fetch joined channels without location filtering (user should see all joined channels)
        let joinedChannels: Channel[] = [];
        if (userChannelIds.size > 0) {
          const { data: joinedChannelsData, error: joinedError } = await supabase
            .from('channels')
            .select('*')
            .in('id', Array.from(userChannelIds))
            .order('created_at', { ascending: false });

          if (joinedError) throw joinedError;

          // Get member counts for joined channels
          joinedChannels = await Promise.all(
            (joinedChannelsData || []).map(async (channel) => {
              const { count } = await supabase
                .from('channel_members')
                .select('*', { count: 'exact', head: true })
                .eq('channel_id', channel.id);

              const userRole = userChannelRoles.get(channel.id);

              // Calculate unread message count
              let unreadCount = 0;
              try {
                // Get the user's last visit to this channel from localStorage or assume 24 hours ago if first time
                const lastVisitKey = `channel_${channel.id}_last_visit_${user.id}`;
                const lastVisit = localStorage.getItem(lastVisitKey);
                const lastVisitTime = lastVisit ? new Date(lastVisit) : new Date(Date.now() - 24 * 60 * 60 * 1000);

                // Count unread messages (messages created after last visit, excluding user's own messages)
                const { count: unreadCountData } = await supabase
                  .from('channel_messages')
                  .select('*', { count: 'exact', head: true })
                  .eq('channel_id', channel.id)
                  .neq('sender_id', user.id)
                  .gt('created_at', lastVisitTime.toISOString());

                unreadCount = unreadCountData || 0;
              } catch (error) {
                console.error('Error calculating unread count for channel', channel.name, ':', error);
              }

              // If user is admin/owner, fetch pending join requests
              let joinRequests: JoinRequest[] = [];
              if (userRole === 'owner' || userRole === 'admin') {
                const { data: requestsData } = await supabase
                  .from('channel_join_requests')
                  .select(`
                    id,
                    user_id,
                    status,
                    message,
                    requested_at
                  `)
                  .eq('channel_id', channel.id)
                  .eq('status', 'pending')
                  .order('requested_at', { ascending: true });

                if (requestsData) {
                  // Get user profiles for the requests
                  const requesterIds = requestsData.map(r => r.user_id);
                  const { data: requesterProfiles } = await supabase
                    .from('user_profiles')
                    .select('user_id, full_name, avatar_url')
                    .in('user_id', requesterIds);

                  const profilesMap = new Map(requesterProfiles?.map(p => [p.user_id, p]) || []);

                  joinRequests = requestsData.map(request => {
                    const profile = profilesMap.get(request.user_id);
                    return {
                      id: request.id,
                      user_id: request.user_id,
                      status: request.status as 'pending' | 'approved' | 'rejected',
                      message: request.message,
                      requested_at: request.requested_at,
                      user: {
                        name: profile?.full_name || t('unknownUser'),
                        avatar: profile?.avatar_url
                      }
                    };
                  });
                }
              }

              return {
                id: channel.id,
                name: channel.name,
                description: channel.description || '',
                members: count || 0,
                isPrivate: channel.is_private,
                isJoined: true, // All channels in this array are joined
                unreadCount: unreadCount > 0 ? unreadCount : undefined,
                creator_id: channel.creator_id,
                created_at: channel.created_at,
                updated_at: channel.updated_at,
                userRole,
                joinRequests,
                messages: []
              };
            })
          );
        }

        // Fetch discoverable channels with location filtering
        let discoverableChannels: Channel[] = [];

        if (effectiveUserLocation) {
          console.log('🌍 Using location-based filtering for discoverable channels:', effectiveUserLocation, 'Range:', debouncedRange[0], 'km');

          try {
            const { data: locationChannels, error: locationError } = await supabase
              .rpc('get_channels_within_range', {
                user_lat: effectiveUserLocation.lat,
                user_lon: effectiveUserLocation.lng,
                max_distance: debouncedRange[0]
              });

            if (locationError) {
              console.error('❌ get_channels_within_range error:', locationError);
              throw locationError;
            }

            if (locationChannels && locationChannels.length > 0) {
              console.log('✅ Found', locationChannels.length, 'channels within', debouncedRange[0], 'km range');
              discoverableChannels = await Promise.all(
                (locationChannels || [])
                  .filter((channel: { id: string }) => !userChannelIds.has(channel.id)) // Exclude already joined channels
                  .map(async (channel: {
                    id: string;
                    name: string;
                    description: string | null;
                    creator_id: string;
                    is_private: boolean;
                    created_at: string;
                    updated_at: string;
                    member_count: number;
                  }) => {
                    // Check if user has pending request for private channels
                    let hasRequestPending = false;
                    if (channel.is_private) {
                      const { data: requestData } = await supabase
                        .from('channel_join_requests')
                        .select('id')
                        .eq('channel_id', channel.id)
                        .eq('user_id', user.id)
                        .eq('status', 'pending')
                        .single();

                      hasRequestPending = !!requestData;
                    }

                    return {
                      id: channel.id,
                      name: channel.name,
                      description: channel.description || '',
                      members: Number(channel.member_count) || 0,
                      isPrivate: channel.is_private,
                      isJoined: false, // All channels in this array are not joined
                      creator_id: channel.creator_id,
                      created_at: channel.created_at,
                      updated_at: channel.updated_at,
                      hasRequestPending,
                      messages: []
                    };
                  })
              );
              console.log('📍 Filtered discoverable channels:', discoverableChannels.length, 'after excluding joined channels');
            } else {
              console.log('⚠️ No channels found within', debouncedRange[0], 'km range, will fallback to all channels');
            }
          } catch (error) {
            console.error('❌ Location-based fetch failed, falling back to all channels:', error);
          }
        } else {
          console.log('📍 No user location available, will show all discoverable channels');
        }

        // If no user location is available, show all non-joined channels
        if (!effectiveUserLocation && discoverableChannels.length === 0) {
          console.log('📍 No user location available, showing all discoverable channels');

          let channelsQuery = supabase
            .from('channels')
            .select('*')
            .order('created_at', { ascending: false });

          // Only exclude joined channels if the user has actually joined any
          if (userChannelIds.size > 0) {
            channelsQuery = channelsQuery.not('id', 'in', `(${Array.from(userChannelIds).join(',')})`);
          }

          const { data: allChannelsData, error: allChannelsError } = await channelsQuery;

          if (allChannelsError) throw allChannelsError;

          console.log('✅ Found', allChannelsData?.length || 0, 'total channels when no location available');

          // Get member counts for discoverable channels
          discoverableChannels = await Promise.all(
            (allChannelsData || [])
              .filter(channel => !userChannelIds.has(channel.id)) // Extra safety check
              .map(async (channel) => {
                const { count } = await supabase
                  .from('channel_members')
                  .select('*', { count: 'exact', head: true })
                  .eq('channel_id', channel.id);

                // Check if user has pending request for private channels
                let hasRequestPending = false;
                if (channel.is_private) {
                  const { data: requestData } = await supabase
                    .from('channel_join_requests')
                    .select('id')
                    .eq('channel_id', channel.id)
                    .eq('user_id', user.id)
                    .eq('status', 'pending')
                    .single();

                  hasRequestPending = !!requestData;
                }

                return {
                  id: channel.id,
                  name: channel.name,
                  description: channel.description || '',
                  members: count || 0,
                  isPrivate: channel.is_private,
                  isJoined: false,
                  creator_id: channel.creator_id,
                  created_at: channel.created_at,
                  updated_at: channel.updated_at,
                  hasRequestPending,
                  messages: []
                };
              })
          );
          console.log('📍 Final discoverable channels:', discoverableChannels.length);
        }

        // Combine joined and discoverable channels
        const finalResult = [...joinedChannels, ...discoverableChannels];
        console.log('🎯 Final result:', {
          joinedChannels: joinedChannels.length,
          discoverableChannels: discoverableChannels.length,
          totalChannels: finalResult.length,
          userLocation: effectiveUserLocation ? 'Available' : 'Not Available',
          range: debouncedRange[0] + 'km'
        });
        return finalResult;
      } catch (error) {
        console.error('Error fetching channels:', error);
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds to prevent excessive refetching
  });

  // Show error toast if channels failed to load
  useEffect(() => {
    if (channelsError) {
      toast.error(t('failedToLoadChannels'));
    }
  }, [channelsError, t]);

  // Update last visit time when actively viewing a channel
  useEffect(() => {
    if (activeChannel && user) {
      const lastVisitKey = `channel_${activeChannel.id}_last_visit_${user.id}`;
      localStorage.setItem(lastVisitKey, new Date().toISOString());

      // Also invalidate channels query to refresh unread counts
      const timer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['channels'] });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [activeChannel?.id, user, queryClient]);

  // Fetch messages for active channel
  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeChannel || !user) return;

      try {
        const { data: messagesData, error } = await supabase
          .from('channel_messages')
          .select(`
            id,
            content,
            sender_id,
            attachment_type,
            attachment_url,
            attachment_name,
            created_at
          `)
          .eq('channel_id', activeChannel.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Get user profiles for message senders
        const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
        const { data: profilesData } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', senderIds);

        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

        const formattedMessages: Message[] = messagesData.map(msg => {
          const profile = profilesMap.get(msg.sender_id);
          const isCurrentUser = msg.sender_id === user.id;

          return {
            id: msg.id,
            text: msg.content,
            isMine: isCurrentUser,
            sender_id: msg.sender_id,
            user: {
              name: isCurrentUser
                ? (user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "You")
                : (profile?.full_name || t('unknownUser')),
              avatar: isCurrentUser
                ? (user.user_metadata?.avatar_url || user.user_metadata?.picture)
                : profile?.avatar_url
            },
            attachment: msg.attachment_type ? {
              type: msg.attachment_type as "image" | "video" | "file",
              url: msg.attachment_url!,
              name: msg.attachment_name || undefined
            } : undefined,
            timestamp: msg.created_at
          };
        });

        // Update activeChannel to trigger re-render
        setActiveChannel(prev => prev ? { ...prev, messages: formattedMessages } : null);
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error(t('failedToLoadMessages'));
      }
    };

    fetchMessages();
  }, [activeChannel?.id, user]);

  const filteredChannels = channels
    .filter(channel => !channel.isJoined)
    .filter(channel =>
      channel.name.toLowerCase().includes(discoverSearchQuery.toLowerCase()) ||
      channel.description.toLowerCase().includes(discoverSearchQuery.toLowerCase())
    );

  const filteredJoinedChannels = channels
    .filter(channel => channel.isJoined)
    .filter(channel =>
      channel.name.toLowerCase().includes(joinedSearchQuery.toLowerCase()) ||
      channel.description.toLowerCase().includes(joinedSearchQuery.toLowerCase())
    );

  const handleJoinChannel = async (channel: Channel) => {
    if (!user) {
      toast.error(t('pleaseSignInToJoinChannels'));
      return;
    }

    try {
      const { error } = await supabase
        .from('channel_members')
        .insert({
          channel_id: channel.id,
          user_id: user.id,
          role: 'member'
        });

      if (error) throw error;

      // Invalidate channels query to refresh data
      queryClient.invalidateQueries({ queryKey: ['channels'] });

      setActiveChannel({ ...channel, isJoined: true });
      toast.success(t('joinedChannel').replace('{name}', channel.name));
    } catch (error) {
      console.error('Error joining channel:', error);
      toast.error(t('failedToJoinChannel'));
    }
  };

  const handleLeaveChannel = async (channel: Channel) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', channel.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Invalidate channels query to refresh data
      queryClient.invalidateQueries({ queryKey: ['channels'] });

      if (activeChannel?.id === channel.id) {
        setActiveChannel(null);
      }

      toast.success(t('leftChannel').replace('{name}', channel.name));
    } catch (error) {
      console.error('Error leaving channel:', error);
      toast.error(t('failedToLeaveChannel'));
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachment) || !activeChannel || !user) return;

    try {
      let messageContent = newMessage.trim();

      // Check for profanity in text messages
      if (messageContent) {
        const moderationResult = moderateText(messageContent);

        if (!moderationResult.isClean) {
          // Handle different severity levels
          if (moderationResult.severity === 'high') {
            toast.error(t('messageContainsInappropriate'));
            return;
          } else if (moderationResult.severity === 'medium') {
            // Option to send cleaned version or reject
            const sendCleaned = confirm(t('sendCleanedVersion') + `\n\nOriginal: "${messageContent}"\nCleaned: "${moderationResult.cleanedText}"`);
            if (!sendCleaned) {
              return;
            }
            messageContent = moderationResult.cleanedText || messageContent;
            toast.info(t('messageCleanedBeforeSending'));
          } else {
            // Low severity - send cleaned version automatically
            messageContent = moderationResult.cleanedText || messageContent;
            toast.info(t('languageFiltered'));
          }
        }
      }

      let attachmentData = null;

      // Handle file upload if there's an attachment
      if (attachment) {
        // For now, create blob URL for immediate display
        // In production, you'd upload to storage and get the real URL
        const url = URL.createObjectURL(attachment);
        const type = attachment.type.startsWith('image/')
          ? 'image'
          : attachment.type.startsWith('video/')
          ? 'video'
          : 'file';

        attachmentData = {
          type,
          url,
          name: attachment.name
        };
      }

      // Save message to database
      const { data: messageData, error } = await supabase
        .from('channel_messages')
        .insert({
          channel_id: activeChannel.id,
          sender_id: user.id,
          content: messageContent || '',
          attachment_type: attachmentData?.type || null,
          attachment_url: attachmentData?.url || null,
          attachment_name: attachmentData?.name || null
        })
        .select()
        .single();

      if (error) throw error;

      // Create the message object for immediate UI update
      const newMsg: Message = {
        id: messageData.id,
        text: messageContent || '',
        isMine: true,
        sender_id: user.id,
        user: {
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "You",
          avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture
        },
        attachment: attachmentData,
        timestamp: messageData.created_at
      };

      // Update local state immediately for better UX
      // Update active channel
      setActiveChannel(prev => prev ? {
        ...prev,
        messages: [...(prev.messages || []), newMsg]
      } : null);

      setNewMessage("");
      setAttachment(null);

      // Update last visit time since user is actively participating
      if (user && activeChannel) {
        const lastVisitKey = `channel_${activeChannel.id}_last_visit_${user.id}`;
        localStorage.setItem(lastVisitKey, new Date().toISOString());
      }

      toast.success(t('messageSent'));
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(t('failedToSendMessage'));
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Show loading state
      toast.info(t('validatingFile'));

      try {
        const validation = await validateAndModerateFile(file);

        if (!validation.isValid) {
          toast.error(validation.error || t('fileValidationFailed'));
          return;
        }

        // Show success message with file info and moderation result
        const fileSizeKB = (file.size / 1024).toFixed(1);
        const sizeDisplay = file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)}MB`
          : `${fileSizeKB}KB`;

        let successMessage = t('fileAttached').replace('{name}', file.name).replace('{size}', sizeDisplay);

        // Add moderation info if available
        if (validation.moderationResult) {
          if (validation.moderationResult.isClean) {
            successMessage += " " + t('contentVerified');
          }
        }

        toast.success(successMessage);
        setAttachment(file);

        // Show warning if moderation service was unavailable
        if (validation.error) {
          toast.warning(validation.error);
        }

      } catch (error) {
        console.error('File validation error:', error);
        toast.error(t('failedToValidateFile'));
        return;
      }
    }

    // Reset the input value so the same file can be selected again if needed
    if (e.target) {
      e.target.value = '';
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const openGoogleMaps = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        window.open(url, '_blank');
      },
      (error) => {
        console.error("Error getting location:", error);
        window.open('https://www.google.com/maps', '_blank');
      }
    );
  };

  const handleEditChannel = async () => {
    if (!editingChannel || !user) return;

    try {
      const { error } = await supabase
        .from('channels')
        .update({
          name: editForm.name,
          description: editForm.description,
          is_private: editForm.isPrivate
        })
        .eq('id', editingChannel.id);

      if (error) throw error;

      // Invalidate channels query to refresh data
      queryClient.invalidateQueries({ queryKey: ['channels'] });

      if (activeChannel?.id === editingChannel.id) {
        setActiveChannel(prev => prev ? {
          ...prev,
          name: editForm.name,
          description: editForm.description,
          isPrivate: editForm.isPrivate
        } : null);
      }

      setEditingChannel(null);
      toast.success(t('channelUpdatedSuccessfully'));
    } catch (error) {
      console.error('Error updating channel:', error);
      toast.error(t('failedToUpdateChannel'));
    }
  };

  const handleDeleteChannel = async (channel: Channel) => {
    if (!user || channel.creator_id !== user.id) return;

    try {
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channel.id);

      if (error) throw error;

      // Invalidate channels query to refresh data
      queryClient.invalidateQueries({ queryKey: ['channels'] });

      if (activeChannel?.id === channel.id) {
        setActiveChannel(null);
      }

      toast.success(t('channelDeletedSuccessfully'));
    } catch (error) {
      console.error('Error deleting channel:', error);
      toast.error(t('failedToDeleteChannel'));
    }
  };

  const isChannelOwner = (channel: Channel) => {
    return user && channel.creator_id === user.id;
  };

  const isChannelAdmin = (channel: Channel) => {
    return user && (channel.userRole === 'owner' || channel.userRole === 'admin' || channel.creator_id === user.id);
  };

  const handleRequestToJoin = async (channel: Channel, message?: string) => {
    if (!user) {
      toast.error(t('pleaseSignInToRequestJoin'));
      return;
    }

    try {
      const { error } = await supabase
        .from('channel_join_requests')
        .insert({
          channel_id: channel.id,
          user_id: user.id,
          message: message || null
        });

      if (error) throw error;

      // Invalidate channels query to refresh data
      queryClient.invalidateQueries({ queryKey: ['channels'] });

      toast.success(t('joinRequestSent').replace('{name}', channel.name));
    } catch (error) {
      console.error('Error sending join request:', error);
      toast.error(t('failedToSendJoinRequest'));
    }
  };

  const handleApproveRequest = async (requestId: string, channelName: string) => {
    try {
      const { data, error } = await supabase.rpc('approve_join_request', {
        request_id: requestId
      });

      if (error) throw error;

      if (data) {
        // Invalidate channels query to refresh data
        queryClient.invalidateQueries({ queryKey: ['channels'] });
        toast.success(t('joinRequestApproved'));
      } else {
        toast.error(t('failedToApproveRequest'));
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error(t('failedToApproveRequest'));
    }
  };

  const handleRejectRequest = async (requestId: string, channelName: string) => {
    try {
      const { data, error } = await supabase.rpc('reject_join_request', {
        request_id: requestId
      });

      if (error) throw error;

      if (data) {
        // Invalidate channels query to refresh data
        queryClient.invalidateQueries({ queryKey: ['channels'] });
        toast.success(t('joinRequestRejected'));
      } else {
        toast.error(t('failedToRejectRequest'));
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error(t('failedToRejectRequest'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-16">
        <TopBar title={t('channels')} showBackButton={false} />
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <TopBar
        title={activeChannel ? activeChannel.name : t('channels')}
        showBackButton={!!activeChannel}
        onBackClick={() => setActiveChannel(null)}
      />

      {!activeChannel ? (
        <main className="container mx-auto px-4 py-6 space-y-4">
          <Tabs defaultValue="discover" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="discover" className="flex-1">{t('discover')}</TabsTrigger>
              <TabsTrigger value="joined" className="flex-1">
                {t('joined')} ({filteredJoinedChannels.length})
                {filteredJoinedChannels.some(c => c.unreadCount) && (
                  <span className={`${isRTL ? 'mr-2' : 'ml-2'} bg-red-500 text-white text-xs px-2 py-0.5 rounded-full`}>
                    {filteredJoinedChannels.filter(c => c.unreadCount).length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="discover" className="mt-4">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() => navigate("/channels/create")}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {t('createChannel')}
                  </Button>
                </div>

                <div className="relative">
                  <Input
                    type="search"
                    placeholder={t('searchChannels')}
                    value={discoverSearchQuery}
                    onChange={(e) => setDiscoverSearchQuery(e.target.value)}
                    className="w-full pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>

                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-4">
                    {filteredChannels.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">
                          {discoverSearchQuery ? t('noChannelsFound') : t('noNewChannelsToDiscover')}
                        </p>
                      </div>
                    ) : (
                      filteredChannels.map(channel => (
                        <Card
                          key={channel.id}
                          className="p-4 cursor-pointer hover:border-2 hover:border-red-500 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium">
                                  {channel.name}
                                </h3>
                                {channel.isPrivate ? (
                                  <Lock className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Globe className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {channel.description}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{channel.members} {t('members')}</span>
                              </div>
                            </div>
                            <Button
                              variant={channel.isPrivate ? "outline" : "default"}
                              onClick={() => {
                                if (channel.isPrivate) {
                                  handleRequestToJoin(channel);
                                } else {
                                  handleJoinChannel(channel);
                                }
                              }}
                              disabled={!user || channel.hasRequestPending}
                            >
                              {channel.isPrivate
                                ? (channel.hasRequestPending ? t('requestPending') : t('requestJoin'))
                                : t('join')
                              }
                            </Button>
                          </div>
                        </Card>
                      )))
                    }
                  </div>
                </ScrollArea>

                <div className="fixed bottom-16 left-0 right-0 bg-background shadow-lg border-t p-2">
                  <div className="container mx-auto">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <Slider
                        value={range}
                        onValueChange={setRange}
                        max={30}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                      <span className="text-sm min-w-[3rem]">{range}km</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={openGoogleMaps}
                        className="h-8 w-8"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="joined" className="mt-4">
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    type="search"
                    placeholder={t('searchJoinedChannels')}
                    value={joinedSearchQuery}
                    onChange={(e) => setJoinedSearchQuery(e.target.value)}
                    className="w-full pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>

                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-4">
                    {filteredJoinedChannels.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">
                          {joinedSearchQuery ? t('noJoinedChannelsMatch') : t('haventJoinedAnyChannels')}
                        </p>
                      </div>
                    ) : (
                      filteredJoinedChannels.map(channel => (
                        <Card
                          key={channel.id}
                          className={`p-4 cursor-pointer hover:border-2 hover:border-red-500 transition-all ${
                            channel.unreadCount ? 'border-2 border-red-500' : ''
                          }`}
                          onClick={() => {
                            setActiveChannel(channel);
                            // Mark channel as visited to reset unread count
                            if (user) {
                              const lastVisitKey = `channel_${channel.id}_last_visit_${user.id}`;
                              localStorage.setItem(lastVisitKey, new Date().toISOString());
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-2 min-w-0">
                                  <h3 className={`text-sm ${channel.unreadCount ? 'font-bold' : 'font-medium'} truncate`}>
                                    {channel.name}
                                  </h3>
                                  {channel.isPrivate ? (
                                    <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  ) : (
                                    <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {channel.unreadCount && (
                                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                                      {channel.unreadCount}
                                    </span>
                                  )}
                                  {/* Show join requests indicator for admins */}
                                  {isChannelAdmin(channel) && channel.joinRequests && channel.joinRequests.length > 0 && (
                                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                                      <span className="hidden sm:inline">{channel.joinRequests.length} {t('requests')}</span>
                                      <span className="sm:hidden">{channel.joinRequests.length}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className={`text-sm text-muted-foreground ${
                                channel.unreadCount ? 'font-semibold' : ''
                              }`}>
                                {channel.description}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{channel.members} {t('members')}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLeaveChannel(channel);
                                }}
                              >
                                {t('leave')}
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setActiveChannel(channel);
                                  // Mark channel as visited to reset unread count
                                  if (user) {
                                    const lastVisitKey = `channel_${channel.id}_last_visit_${user.id}`;
                                    localStorage.setItem(lastVisitKey, new Date().toISOString());
                                  }
                                }}
                              >
                                {t('open')}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      ) : (
        <main className="flex-1 container mx-auto px-4 py-6 overflow-hidden flex flex-col h-[calc(100vh-160px)]">
          <div className="mb-4 p-4 border-b bg-card rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">{activeChannel.name}</h2>
                  {activeChannel.isPrivate ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {activeChannel.members} {t('members')} • {activeChannel.isPrivate ? t('privateChannel') : t('publicChannel')}
                </p>
                {activeChannel.description && (
                  <p className="text-sm text-muted-foreground mt-1">{activeChannel.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Dialog open={showChannelInfo} onOpenChange={setShowChannelInfo}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Info className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <span>{activeChannel.name}</span>
                        {activeChannel.isPrivate ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Globe className="h-4 w-4 text-muted-foreground" />
                        )}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-sm">{t('about')}</h4>
                        <p className="text-sm text-muted-foreground">
                          {activeChannel.description || t('noDescriptionProvided')}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{t('details')}</h4>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>• {activeChannel.members} {t('members')}</p>
                          <p>• {activeChannel.isPrivate ? t('privateChannel') : t('publicChannel')}</p>
                          <p>• {t('created').replace('{date}', new Date(activeChannel.created_at).toLocaleDateString())}</p>
                          {activeChannel.userRole && (
                            <p>• {t('youAre').replace('{role}', activeChannel.userRole)}</p>
                          )}
                        </div>
                      </div>

                      {/* Join Requests Section - Only for admins */}
                      {isChannelAdmin(activeChannel) && activeChannel.joinRequests && activeChannel.joinRequests.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm">{t('joinRequests').replace('{count}', activeChannel.joinRequests.length.toString())}</h4>
                          <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                            {activeChannel.joinRequests.map(request => (
                              <div key={request.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Avatar
                                    className="h-6 w-6 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                    onClick={() => {
                                      setShowChannelInfo(false);
                                      navigate(`/seller/${request.user_id}`);
                                    }}
                                  >
                                    <AvatarImage src={request.user.avatar} />
                                    <AvatarFallback>{request.user.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <p
                                      className="text-sm font-medium cursor-pointer hover:text-primary transition-colors"
                                      onClick={() => {
                                        setShowChannelInfo(false);
                                        navigate(`/seller/${request.user_id}`);
                                      }}
                                    >
                                      {request.user.name}
                                    </p>
                                    {request.message && (
                                      <p className="text-xs text-muted-foreground">{request.message}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(request.requested_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => handleApproveRequest(request.id, activeChannel.name)}
                                  >
                                    ✓
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => handleRejectRequest(request.id, activeChannel.name)}
                                  >
                                    ✗
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                {isChannelAdmin(activeChannel) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingChannel(activeChannel);
                          setEditForm({
                            name: activeChannel.name,
                            description: activeChannel.description,
                            isPrivate: activeChannel.isPrivate
                          });
                        }}
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        {t('editChannel')}
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('deleteChannel')}
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('deleteChannel')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('deleteChannelConfirm').replace('{name}', activeChannel.name)}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteChannel(activeChannel)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {t('delete')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLeaveChannel(activeChannel)}
                >
                  {t('leave')}
                </Button>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 mb-16">
            <div className="space-y-4 pb-4">
              {!activeChannel.isJoined && activeChannel.isPrivate ? (
                <div className="text-center py-8">
                  <div className="bg-muted p-6 rounded-lg">
                    <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">{t('privateChannel')}</h3>
                    <p className="text-muted-foreground text-sm">
                      {t('privateChannelMessage')}
                    </p>
                  </div>
                </div>
              ) : activeChannel.messages?.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {t('noMessagesYet')}
                  </p>
                </div>
              ) : (
                activeChannel.messages?.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex items-end gap-2">
                      {!message.isMine && (
                        <Avatar
                          className="h-6 w-6 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                          onClick={() => {
                            if (message.sender_id && !message.isMine) {
                              navigate(`/seller/${message.sender_id}`);
                            }
                          }}
                        >
                          <AvatarImage src={message.user?.avatar} />
                          <AvatarFallback>{message.user?.name?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <div
                          className={`rounded-lg px-4 py-2 max-w-[80vw] ${
                            message.isMine
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-100 text-black'
                          }`}
                        >
                          {message.attachment && (
                            <div className="mb-2">
                              {message.attachment.type === "image" && (
                                <img
                                  src={message.attachment.url}
                                  alt="Attachment"
                                  className="rounded-lg max-h-60 object-contain"
                                />
                              )}
                              {message.attachment.type === "video" && (
                                <video
                                  src={message.attachment.url}
                                  controls
                                  className="rounded-lg max-h-60 w-full"
                                />
                              )}
                              {message.attachment.type === "file" && (
                                <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg">
                                  <Paperclip className="h-4 w-4 text-gray-600" />
                                  <span className="text-sm truncate">{message.attachment.name}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {message.text}
                        </div>

                        {/* Message Reactions */}
                        <MessageReactions
                          messageId={message.id}
                          isChannelMessage={true}
                          className="mt-1"
                        />

                        {message.user && (
                          <div className={`flex items-center gap-1 mt-1 ${message.isMine ? 'justify-end' : 'justify-start'}`}>
                            <span
                              className={`text-xs text-muted-foreground ${
                                !message.isMine ? 'cursor-pointer hover:text-primary transition-colors' : ''
                              }`}
                              onClick={() => {
                                if (message.sender_id && !message.isMine) {
                                  navigate(`/seller/${message.sender_id}`);
                                }
                              }}
                            >
                              {message.user.name}
                            </span>
                            <Avatar
                              className={`h-4 w-4 ${
                                !message.isMine ? 'cursor-pointer hover:ring-2 hover:ring-primary transition-all' : ''
                              }`}
                              onClick={() => {
                                if (message.sender_id && !message.isMine) {
                                  navigate(`/seller/${message.sender_id}`);
                                }
                              }}
                            >
                              <AvatarImage src={message.user.avatar} />
                            </Avatar>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Only show message input if user is a member or it's a public channel */}
          {(activeChannel.isJoined || !activeChannel.isPrivate) && (
            <div className="fixed bottom-16 left-0 right-0 bg-background shadow-lg border-t">
              <div className="container mx-auto p-3">
                {attachment && (
                  <div className="flex items-center gap-2 bg-muted p-2 rounded-lg mb-2">
                    <div className="flex-1 truncate text-sm">
                      <Paperclip className="h-4 w-4 text-gray-600 inline mr-1" />
                      {attachment.name}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full"
                      onClick={removeAttachment}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <form onSubmit={sendMessage} className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                    >
                      <Smile className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="start"
                    className="w-[280px] mb-2"
                  >
                    <EmojiPicker
                      onEmojiClick={onEmojiClick}
                      width="100%"
                      height={350}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={handleAttachmentClick}
                    >
                      <Paperclip className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="start"
                    className="w-[280px] mb-2 text-sm"
                  >
                    <div className="space-y-2">
                      <h4 className="font-semibold">{t('fileUploadLimits')}</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>{t('imagesLimit')}</span>
                          <span className="font-medium">5MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('videosLimit')}</span>
                          <span className="font-medium">5MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('documentsLimit')}</span>
                          <span className="font-medium">10MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('otherFilesLimit')}</span>
                          <span className="font-medium">5MB</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground border-t pt-2">
                        {t('clickAttachmentButton')}
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*,video/*,application/*,text/*"
                />

                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t('typeAMessage')}
                  className="flex-1"
                />

                <Button
                  type="submit"
                  size="icon"
                  disabled={!newMessage.trim() && !attachment}
                  className="h-9 w-9 rounded-full"
                >
                  <Send className="h-5 w-5" />
                </Button>
                </form>
              </div>
            </div>
          )}
        </main>
      )}

      {/* Edit Channel Dialog */}
      <Dialog open={!!editingChannel} onOpenChange={(open) => !open && setEditingChannel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editChannel')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('channelName')}</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('enterChannelName')}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('description')}</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('enterChannelDescription')}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="private"
                checked={editForm.isPrivate}
                onChange={(e) => setEditForm(prev => ({ ...prev, isPrivate: e.target.checked }))}
                className="h-4 w-4"
              />
              <label htmlFor="private" className="text-sm font-medium">
                {t('privateChannelOption')}
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingChannel(null)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleEditChannel}>
              {t('saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Channels;
