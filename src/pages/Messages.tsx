import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Send, Smile, Paperclip, X, ArrowLeft, Plus, MessageCircle, User, Phone, Video, MoreVertical, Image, Mic } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useLocation, Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { moderateText, validateAndModerateFile } from "@/utils/contentModeration";

interface Message {
  text: string;
  isMine: boolean;
  user?: {
    name: string;
    avatar?: string;
  };
  attachment?: {
    type: "image" | "video" | "file";
    url: string;
    name?: string;
  };
  itemDetails?: {
    title: string;
    price: number;
    image: string;
    link: string;
  };
  timestamp?: string;
}

interface Conversation {
  id: string;
  user: {
    name: string;
    avatar?: string;
  };
  lastMessage: string;
  timestamp: string;
  unread?: boolean;
  unreadCount?: number;
}

// Custom hook for window size
const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 350,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

const Messages = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const selectedUserId = searchParams.get("userId");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [locationStateProcessed, setLocationStateProcessed] = useState(false);
  const { width: windowWidth, height: windowHeight } = useWindowSize();

  // Fetch user's conversations from database
  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Get conversations where user is participant
        const { data: conversationsData, error } = await supabase
          .from('conversations')
          .select(`
            id,
            participant1_id,
            participant2_id,
            item_id,
            updated_at,
            created_at
          `)
          .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
          .order('updated_at', { ascending: false });

        if (error) throw error;

        const conversationsWithUsers = await Promise.all(
          (conversationsData || []).map(async (conv) => {
            const otherUserId = conv.participant1_id === user.id ? conv.participant2_id : conv.participant1_id;

            // Check if user is blocked or has blocked the other user
            try {
              const { data: isBlocked } = await supabase.rpc('check_if_user_is_blocked', {
                blocker_uuid: user.id,
                blocked_uuid: otherUserId
              });

              const { data: hasBlockedMe } = await supabase.rpc('check_if_user_is_blocked', {
                blocker_uuid: otherUserId,
                blocked_uuid: user.id
              });

              // Skip blocked users
              if (isBlocked || hasBlockedMe) {
                return null;
              }
            } catch (blockingError) {
              console.warn('Blocking check failed for conversation, continuing:', blockingError.message);
              // Continue without blocking if functions don't exist
            }

            // Get user profile for the other participant
            const { data: profile, error: profileError } = await supabase
              .from('user_profiles')
              .select('full_name, avatar_url')
              .eq('user_id', otherUserId)
              .maybeSingle();

            // Get last message for this conversation
            const { data: lastMessage } = await supabase
              .from('messages')
              .select('content, created_at')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            return {
              id: otherUserId,
              conversationId: conv.id,
              user: {
                name: profile?.full_name || "User",
                avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${profile?.full_name || 'user'}`
              },
              lastMessage: lastMessage?.content || "Start a conversation...",
              timestamp: lastMessage?.created_at
                ? new Date(lastMessage.created_at).toLocaleDateString()
                : new Date(conv.created_at).toLocaleDateString(),
              unread: false
            };
          })
        );

        // Filter out null values (blocked users)
        const filteredConversations = conversationsWithUsers.filter(conv => conv !== null);

        setConversations(filteredConversations);

        // Handle new conversation from location state (only once)
        if (!locationStateProcessed) {
          const sellerInfo = location.state as {
            sellerId?: string;
            sellerName?: string;
            sellerAvatar?: string;
            itemId?: string;
            itemDetails?: {
              title: string;
              price: number;
              image: string;
              link: string;
            };
          } | null;

          if (sellerInfo?.sellerId && sellerInfo?.sellerName) {
            console.log('👤 Seller info received:', sellerInfo);

            // Check if seller is blocked or has blocked the current user before creating conversation
            try {
              const { data: isBlocked } = await supabase.rpc('check_if_user_is_blocked', {
                blocker_uuid: user.id,
                blocked_uuid: sellerInfo.sellerId
              });

              const { data: hasBlockedMe } = await supabase.rpc('check_if_user_is_blocked', {
                blocker_uuid: sellerInfo.sellerId,
                blocked_uuid: user.id
              });

              if (isBlocked || hasBlockedMe) {
                console.log('❌ Cannot create conversation with blocked user');
                toast.error("Cannot message this user");
                return;
              }
            } catch (blockingError) {
              console.warn('Blocking check failed for new conversation, continuing:', blockingError.message);
              // Continue without blocking if functions don't exist
            }

            const existingConv = filteredConversations.find(c => c && c.id === sellerInfo.sellerId);
            if (!existingConv) {
              console.log('🆕 Creating new conversation UI entry');
              const newConversation: Conversation = {
                id: sellerInfo.sellerId,
                user: {
                  name: sellerInfo.sellerName,
                  avatar: sellerInfo.sellerAvatar || `https://api.dicebear.com/7.x/avatars/svg?seed=${sellerInfo.sellerName}`
                },
                lastMessage: "Start a conversation...",
                timestamp: "Just now",
                unread: false
              };
              setConversations(prev => [newConversation, ...prev]);
            } else {
              console.log('📱 Found existing conversation UI entry');
            }

            // Auto-send default message with item details if provided
            // Always send for new item inquiries, regardless of conversation status
            if (sellerInfo.itemDetails) {
              console.log('📦 Item details found, scheduling default message');
              setTimeout(() => {
                sendDefaultItemMessage(sellerInfo.sellerId!, sellerInfo.itemDetails!);
              }, 1000); // Increase delay to ensure everything is ready
            } else {
              console.log('❌ No item details found in seller info');
            }
          } else {
            console.log('❌ No seller info found in location state');
          }

          setLocationStateProcessed(true);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
        toast.error("Failed to load conversations");
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user, locationStateProcessed]);

  // Fetch messages for selected conversation
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedUserId || !user) return;

      try {
        // Find the conversation between current user and selected user
        const { data: conversations, error: convError } = await supabase
          .from('conversations')
          .select('id, participant1_id, participant2_id')
          .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
          .or(`participant1_id.eq.${selectedUserId},participant2_id.eq.${selectedUserId}`);

        if (convError) {
          throw convError;
        }

        // Find conversation where both users are participants
        const conversation = conversations?.find(conv =>
          (conv.participant1_id === user.id && conv.participant2_id === selectedUserId) ||
          (conv.participant1_id === selectedUserId && conv.participant2_id === user.id)
        );

        if (!conversation) {
          // No conversation exists yet
          setMessages([]);
          return;
        }

        // Get messages for this conversation
        const { data, error } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            sender_id,
            created_at
          `)
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const formattedMessages: Message[] = (data || []).map(msg => ({
          text: msg.content,
          isMine: msg.sender_id === user.id,
          timestamp: msg.created_at
        }));

        setMessages(formattedMessages);
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error("Failed to load messages");
      }
    };

    fetchMessages();
  }, [selectedUserId, user]);

  const selectConversation = (conversationId: string) => {
    setSearchParams({ userId: conversationId });
    setShowMobileChat(true); // Show chat on mobile when conversation is selected
  };

  const handleBackToConversations = () => {
    setShowMobileChat(false);
    setSearchParams({}); // Clear the selected user from URL params
  };

  const sendDefaultItemMessage = async (sellerId: string, itemDetails: { title: string; price: number; image: string; link: string; }) => {
    if (!user) return;

    console.log('🚀 Sending default item message:', { sellerId, itemDetails });

    // Check if user is blocked or has blocked the seller before sending message
    try {
      const { data: isBlocked } = await supabase.rpc('check_if_user_is_blocked', {
        blocker_uuid: user.id,
        blocked_uuid: sellerId
      });

      const { data: hasBlockedMe } = await supabase.rpc('check_if_user_is_blocked', {
        blocker_uuid: sellerId,
        blocked_uuid: user.id
      });

      if (isBlocked || hasBlockedMe) {
        console.log('❌ Cannot send message to blocked user');
        toast.error("Cannot message this seller");
        return;
      }
    } catch (blockingError) {
      console.warn('Blocking check failed for default message, continuing:', blockingError.message);
      // Continue without blocking if functions don't exist
    }

    try {
      // Create default message with item details
      const defaultMessage = `Hi! I'm interested in this item:\n\n📦 ${itemDetails.title}\n💰 $${itemDetails.price}\n🔗 ${itemDetails.link}`;

      // Find or create conversation
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, participant1_id, participant2_id')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .or(`participant1_id.eq.${sellerId},participant2_id.eq.${sellerId}`);

      console.log('📋 Found conversations:', conversations);

      // Find conversation where both users are participants
      const conversation = conversations?.find(conv =>
        (conv.participant1_id === user.id && conv.participant2_id === sellerId) ||
        (conv.participant1_id === sellerId && conv.participant2_id === user.id)
      );

      let conversationId = conversation?.id;

      if (!conversationId) {
        console.log('🆕 Creating new conversation');
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            participant1_id: user.id,
            participant2_id: sellerId
          })
          .select('id')
          .single();

        if (convError) {
          console.error('❌ Error creating conversation:', convError);
          throw convError;
        }
        conversationId = newConv.id;
        console.log('✅ Created conversation:', conversationId);
      } else {
        console.log('📱 Using existing conversation:', conversationId);
      }

      // Check if this exact message already exists to avoid duplicates
      const { data: existingMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('sender_id', user.id)
        .eq('content', defaultMessage)
        .limit(1);

      if (existingMessages && existingMessages.length > 0) {
        console.log('📬 Message already exists, skipping');
        return;
      }

      // Save the default message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: defaultMessage
        });

      if (messageError) {
        console.error('❌ Error saving message:', messageError);
        throw messageError;
      }

      console.log('✅ Default message sent successfully');

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Update local state if this is the current conversation
      if (selectedUserId === sellerId) {
        const messageData: Message = {
          text: defaultMessage,
          isMine: true,
          timestamp: new Date().toISOString(),
          itemDetails: itemDetails
        };
        setMessages(prev => [...prev, messageData]);
      }

      // Update last message in conversations
      setConversations(prev => prev.map(conv =>
        conv.id === sellerId
          ? { ...conv, lastMessage: `📦 ${itemDetails.title}`, timestamp: "Just now" }
          : conv
      ));

    } catch (error) {
      console.error('❌ Error sending default message:', error);
      // Show user-friendly error
      toast.error("Failed to send item details. Please try again.");
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !attachment) || !selectedUserId || !user) return;

    // Check if user is blocked or has blocked the recipient before sending message
    try {
      const { data: isBlocked } = await supabase.rpc('check_if_user_is_blocked', {
        blocker_uuid: user.id,
        blocked_uuid: selectedUserId
      });

      const { data: hasBlockedMe } = await supabase.rpc('check_if_user_is_blocked', {
        blocker_uuid: selectedUserId,
        blocked_uuid: user.id
      });

      if (isBlocked || hasBlockedMe) {
        toast.error("Cannot send message to this user");
        return;
      }
    } catch (blockingError) {
      console.warn('Blocking check failed for send message, continuing:', blockingError.message);
      // Continue without blocking if functions don't exist
    }

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

    const messageData: Message = {
      text: messageContent,
      isMine: true,
      user: {
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "You",
        avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture
      },
      timestamp: new Date().toISOString()
    };

    if (attachment) {
      const url = URL.createObjectURL(attachment);
      messageData.attachment = {
        type: attachment.type.startsWith('image/') ? 'image' :
              attachment.type.startsWith('video/') ? 'video' : 'file',
        url,
        name: attachment.name
      };
    }

    // Add message to local state immediately for better UX
    setMessages(prev => [...prev, messageData]);

    // Save message to database
    try {
      // Find or create conversation
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, participant1_id, participant2_id')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .or(`participant1_id.eq.${selectedUserId},participant2_id.eq.${selectedUserId}`);

      // Find conversation where both users are participants
      const conversation = conversations?.find(conv =>
        (conv.participant1_id === user.id && conv.participant2_id === selectedUserId) ||
        (conv.participant1_id === selectedUserId && conv.participant2_id === user.id)
      );

      let conversationId = conversation?.id;

      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            participant1_id: user.id,
            participant2_id: selectedUserId
          })
          .select('id')
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
      }

      // Save the message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: messageContent
        });

      if (messageError) throw messageError;

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Update last message in conversations
      setConversations(prev => prev.map(conv =>
        conv.id === selectedUserId
          ? { ...conv, lastMessage: messageContent || "📎 Attachment", timestamp: "Just now" }
          : conv
      ));

    } catch (error) {
      console.error('Error saving message:', error);
      toast.error("Failed to send message");
      // Remove message from local state on error
      setMessages(prev => prev.slice(0, -1));
    }

    setNewMessage("");
    setAttachment(null);
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
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const selectedConversation = conversations.find(conv => conv.id === selectedUserId);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-16">
        <TopBar title="Messages" />
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-8rem)]">
        {/* Conversations Sidebar */}
        <div className={`w-full md:w-80 bg-background border-r flex flex-col ${
          showMobileChat ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="p-4 border-b">
            <h2 className="font-semibold text-lg">Conversations</h2>
            <p className="text-sm text-muted-foreground">
              {conversations.length === 0 ? "No conversations yet" : `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          <ScrollArea className="flex-1">
            {conversations.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-muted-foreground text-sm">
                  No conversations yet. Contact a seller to start chatting!
                </p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => selectConversation(conversation.id)}
                  className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedUserId === conversation.id ? 'bg-muted border-primary' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conversation.user.avatar} />
                      <AvatarFallback>{conversation.user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sm truncate">
                          {conversation.user.name}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {conversation.timestamp}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.lastMessage}
                      </p>
                    </div>
                    {conversation.unreadCount && conversation.unreadCount > 0 && (
                      <div className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {conversation.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Messages Area */}
        <div className={`flex-1 flex flex-col ${
          showMobileChat ? 'flex' : 'hidden md:flex'
        }`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b bg-background">
                <div className="flex items-center gap-3">
                  {/* Back button for mobile */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToConversations}
                    className="md:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedConversation.user.avatar} />
                    <AvatarFallback>{selectedConversation.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <Link
                    to={`/seller/${selectedUserId}`}
                    className="font-medium hover:text-primary transition-colors cursor-pointer"
                  >
                    {selectedConversation.user.name}
                  </Link>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        Start a conversation with {selectedConversation.user.name}
                      </p>
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex gap-2 max-w-xs lg:max-w-md`}>
                          {!message.isMine && (
                            <Avatar className="h-6 w-6 mt-2">
                              <AvatarImage src={message.user?.avatar} />
                              <AvatarFallback>{message.user?.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`px-3 py-2 rounded-lg ${
                              message.isMine
                                ? 'bg-red-500 text-white'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {message.attachment && (
                              <div className="mb-2">
                                {message.attachment.type === 'image' ? (
                                  <img
                                    src={message.attachment.url}
                                    alt="Attachment"
                                    className="max-w-full h-auto rounded"
                                  />
                                ) : (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Paperclip className="h-4 w-4" />
                                    <span>{message.attachment.name || 'File'}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            {message.text && (
                              <p className="text-sm">{message.text}</p>
                            )}
                            {message.itemDetails && (
                              <div className={`mt-2 p-3 rounded-lg border ${
                                message.isMine
                                  ? 'bg-primary/10 border-primary/20 text-primary-foreground'
                                  : 'bg-muted border-border text-foreground'
                              }`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                                    <img
                                      src={message.itemDetails.image}
                                      alt={message.itemDetails.title}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-sm truncate">{message.itemDetails.title}</h4>
                                    <p className="text-sm font-medium">${message.itemDetails.price}</p>
                                  </div>
                                </div>
                                <a
                                  href={message.itemDetails.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`text-xs underline ${
                                    message.isMine ? 'text-primary' : 'text-blue-600'
                                  }`}
                                >
                                  View Item Details →
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t bg-background">
                {attachment && (
                  <div className="mb-3 p-2 bg-muted rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Paperclip className="h-4 w-4" />
                      <span>{attachment.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={removeAttachment}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                  />

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,video/*,application/*,text/*"
                  />

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" onClick={handleAttachmentClick}>
                        <Paperclip className="h-4 w-4" />
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

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="ghost" size="icon">
                        <Smile className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="p-0 w-auto max-w-[95vw] max-h-[80vh] border-0 shadow-lg"
                      align="end"
                      side="top"
                      sideOffset={8}
                    >
                      <div className="overflow-hidden rounded-lg bg-background">
                        <EmojiPicker
                          onEmojiClick={onEmojiClick}
                          width={windowWidth < 640 ? windowWidth - 40 : Math.min(350, windowWidth - 40)}
                          height={windowWidth < 640 ? Math.min(300, windowHeight * 0.5) : Math.min(400, windowHeight * 0.6)}
                          searchDisabled={windowWidth < 400}
                          skinTonesDisabled={windowWidth < 400}
                          previewConfig={windowWidth < 400 ? {
                            showPreview: false
                          } : {
                            defaultEmoji: "1f60a",
                            defaultCaption: "What's your mood?"
                          }}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button type="submit" disabled={!newMessage.trim() && !attachment}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to Messages</h3>
                <p className="text-muted-foreground">
                  {conversations.length === 0
                    ? "Contact sellers to start conversations"
                    : "Select a conversation to start messaging"
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Messages;
