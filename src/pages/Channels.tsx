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
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { moderateText, validateAndModerateFile } from "@/utils/contentModeration";

interface MessageAttachment {
  type: "image" | "video" | "file";
  url: string;
  name?: string;
}

interface Message {
  id: string;
  text: string;
  isMine: boolean;
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
                        name: profile?.full_name || "Unknown User",
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
      toast.error("Failed to load channels");
    }
  }, [channelsError]);

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
            user: {
              name: isCurrentUser
                ? (user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "You")
                : (profile?.full_name || "Unknown User"),
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
        toast.error("Failed to load messages");
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
      toast.error("Please sign in to join channels");
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
      toast.success(`Joined ${channel.name}!`);
    } catch (error) {
      console.error('Error joining channel:', error);
      toast.error("Failed to join channel");
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

      toast.success(`Left ${channel.name}`);
    } catch (error) {
      console.error('Error leaving channel:', error);
      toast.error("Failed to leave channel");
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
            toast.error("Message contains inappropriate content and cannot be sent.");
            return;
          } else if (moderationResult.severity === 'medium') {
            // Option to send cleaned version or reject
            const sendCleaned = confirm(`Your message contains inappropriate language. Would you like to send a cleaned version instead?\n\nOriginal: "${messageContent}"\nCleaned: "${moderationResult.cleanedText}"`);
            if (!sendCleaned) {
              return;
            }
            messageContent = moderationResult.cleanedText || messageContent;
            toast.info("Message has been cleaned before sending.");
          } else {
            // Low severity - send cleaned version automatically
            messageContent = moderationResult.cleanedText || messageContent;
            toast.info("Some language has been filtered from your message.");
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
      toast.success("Message sent!");
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message");
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
      toast.info("Validating file...");

      try {
        const validation = await validateAndModerateFile(file);

        if (!validation.isValid) {
          toast.error(validation.error || "File validation failed");
          return;
        }

        // Show success message with file info and moderation result
        const fileSizeKB = (file.size / 1024).toFixed(1);
        const sizeDisplay = file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)}MB`
          : `${fileSizeKB}KB`;

        let successMessage = `File attached: ${file.name} (${sizeDisplay})`;

        // Add moderation info if available
        if (validation.moderationResult) {
          if (validation.moderationResult.isClean) {
            successMessage += " ✅ Content verified";
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
        toast.error("Failed to validate file");
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
      toast.success("Channel updated successfully!");
    } catch (error) {
      console.error('Error updating channel:', error);
      toast.error("Failed to update channel");
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

      toast.success("Channel deleted successfully!");
    } catch (error) {
      console.error('Error deleting channel:', error);
      toast.error("Failed to delete channel");
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
      toast.error("Please sign in to request to join channels");
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

      toast.success(`Join request sent for ${channel.name}`);
    } catch (error) {
      console.error('Error sending join request:', error);
      toast.error("Failed to send join request");
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
        toast.success("Join request approved!");
      } else {
        toast.error("Failed to approve request");
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error("Failed to approve request");
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
        toast.success("Join request rejected");
      } else {
        toast.error("Failed to reject request");
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error("Failed to reject request");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-16">
        <TopBar title="Channels" showBackButton={false} />
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
        title={activeChannel ? activeChannel.name : "Channels"}
        showBackButton={!!activeChannel}
        onBackClick={() => setActiveChannel(null)}
      />

      {!activeChannel ? (
        <main className="container mx-auto px-4 py-6 space-y-4">
          <Tabs defaultValue="discover" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="discover" className="flex-1">Discover</TabsTrigger>
              <TabsTrigger value="joined" className="flex-1">
                Joined ({filteredJoinedChannels.length})
                {filteredJoinedChannels.some(c => c.unreadCount) && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
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
                    Create Channel
                  </Button>
                </div>

                <div className="relative">
                  <Input
                    type="search"
                    placeholder="Search channels..."
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
                          {discoverSearchQuery ? "No channels found matching your search" : "No new channels to discover"}
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
                                <span className="text-xs text-muted-foreground">{channel.members} members</span>
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
                                ? (channel.hasRequestPending ? "Request Pending" : "Request Join")
                                : "Join"
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
                    placeholder="Search joined channels..."
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
                          {joinedSearchQuery ? "No joined channels match your search" : "You haven't joined any channels yet"}
                        </p>
                      </div>
                    ) : (
                      filteredJoinedChannels.map(channel => (
                        <Card
                          key={channel.id}
                          className={`p-4 cursor-pointer hover:border-2 hover:border-red-500 transition-all ${
                            channel.unreadCount ? 'border-2 border-red-500' : ''
                          }`}
                          onClick={() => setActiveChannel(channel)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className={`text-sm ${channel.unreadCount ? 'font-bold' : 'font-medium'}`}>
                                  {channel.name}
                                </h3>
                                {channel.isPrivate ? (
                                  <Lock className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Globe className="h-4 w-4 text-muted-foreground" />
                                )}
                                {channel.unreadCount && (
                                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                    {channel.unreadCount}
                                  </span>
                                )}
                                {/* Show join requests indicator for admins */}
                                {isChannelAdmin(channel) && channel.joinRequests && channel.joinRequests.length > 0 && (
                                  <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                                    {channel.joinRequests.length} requests
                                  </span>
                                )}
                              </div>
                              <p className={`text-sm text-muted-foreground ${
                                channel.unreadCount ? 'font-semibold' : ''
                              }`}>
                                {channel.description}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{channel.members} members</span>
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
                                Leave
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => setActiveChannel(channel)}
                              >
                                Open
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
                  {activeChannel.members} members • {activeChannel.isPrivate ? 'Private' : 'Public'}
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
                        <h4 className="font-medium text-sm">About</h4>
                        <p className="text-sm text-muted-foreground">
                          {activeChannel.description || "No description provided."}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Details</h4>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>• {activeChannel.members} members</p>
                          <p>• {activeChannel.isPrivate ? 'Private' : 'Public'} channel</p>
                          <p>• Created {new Date(activeChannel.created_at).toLocaleDateString()}</p>
                          {activeChannel.userRole && (
                            <p>• You are: {activeChannel.userRole}</p>
                          )}
                        </div>
                      </div>

                      {/* Join Requests Section - Only for admins */}
                      {isChannelAdmin(activeChannel) && activeChannel.joinRequests && activeChannel.joinRequests.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm">Join Requests ({activeChannel.joinRequests.length})</h4>
                          <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                            {activeChannel.joinRequests.map(request => (
                              <div key={request.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={request.user.avatar} />
                                    <AvatarFallback>{request.user.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-medium">{request.user.name}</p>
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
                        Edit Channel
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Channel
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Channel</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{activeChannel.name}"? This action cannot be undone and all messages will be permanently lost.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteChannel(activeChannel)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
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
                  Leave
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
                    <h3 className="font-medium mb-2">Private Channel</h3>
                    <p className="text-muted-foreground text-sm">
                      You need to be approved by an admin to view messages in this private channel.
                    </p>
                  </div>
                </div>
              ) : activeChannel.messages?.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No messages yet. Start the conversation!
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
                        <Avatar className="h-6 w-6">
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
                        {message.user && (
                          <div className={`flex items-center gap-1 mt-1 ${message.isMine ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-xs text-muted-foreground">
                              {message.user.name}
                            </span>
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={message.user.avatar} />
                              <AvatarFallback>{message.user.name?.charAt(0)}</AvatarFallback>
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
                      <h4 className="font-semibold">File Upload Limits</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>📷 Images (JPEG, PNG, GIF, WebP):</span>
                          <span className="font-medium">5MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>🎥 Videos (MP4, MOV, WMV):</span>
                          <span className="font-medium">5MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>📄 Documents (PDF, DOC, TXT):</span>
                          <span className="font-medium">10MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>📁 Other files:</span>
                          <span className="font-medium">5MB</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground border-t pt-2">
                        Click the attachment button to select a file
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
                  placeholder="Type a message..."
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
            <DialogTitle>Edit Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Channel Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter channel name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter channel description"
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
                Private Channel
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingChannel(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditChannel}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Channels;
