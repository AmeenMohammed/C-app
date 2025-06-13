import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Send, Smile, Paperclip, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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

  // Fetch user's conversations from database (placeholder for now)
  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // TODO: Implement real conversations from database
        // For now, showing empty state or sample data based on user

        // Check if we have seller information in the location state
        const sellerInfo = location.state as {
          sellerId?: string;
          sellerName?: string;
          sellerAvatar?: string;
        } | null;

        if (sellerInfo?.sellerId && sellerInfo?.sellerName) {
          // Add this seller to our conversations list
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

          setConversations([newConversation]);
        } else {
          // Show empty state for new users
          setConversations([]);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
        toast.error("Failed to load conversations");
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user, location.state]);

  // Fetch messages for selected conversation (placeholder for now)
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedUserId || !user) return;

      try {
        // TODO: Implement real messages from database
        // For now, starting with empty messages for new conversations
        setMessages([]);
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error("Failed to load messages");
      }
    };

    fetchMessages();
  }, [selectedUserId, user]);

  const selectConversation = (userId: string) => {
    setSearchParams({ userId });
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !attachment) || !selectedUserId || !user) return;

    const messageData: Message = {
      text: newMessage,
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

    // TODO: Save message to database
    try {
      // Placeholder for database save
      console.log('Saving message to database:', messageData);

      // Update last message in conversations
      setConversations(prev => prev.map(conv =>
        conv.id === selectedUserId
          ? { ...conv, lastMessage: newMessage || "📎 Attachment", timestamp: "Just now" }
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error("File size must be less than 10MB");
        return;
      }
      setAttachment(file);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const selectedConversation = conversations.find(conv => conv.id === selectedUserId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-16">
        <TopBar title="Messages" />
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TopBar title="Messages" />

      <div className="flex h-[calc(100vh-8rem)]">
        {/* Conversations Sidebar */}
        <div className="w-80 bg-white border-r flex flex-col">
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
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedUserId === conversation.id ? 'bg-blue-50 border-blue-200' : ''
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
                      <div className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
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
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b bg-white">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedConversation.user.avatar} />
                    <AvatarFallback>{selectedConversation.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-medium">{selectedConversation.user.name}</h3>
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
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-900'
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
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t bg-white">
                {attachment && (
                  <div className="mb-3 p-2 bg-gray-100 rounded-lg flex items-center justify-between">
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
                    accept="image/*,video/*,.pdf,.doc,.docx"
                  />

                  <Button type="button" variant="ghost" size="icon" onClick={handleAttachmentClick}>
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="ghost" size="icon">
                        <Smile className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0">
                      <EmojiPicker onEmojiClick={onEmojiClick} />
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
