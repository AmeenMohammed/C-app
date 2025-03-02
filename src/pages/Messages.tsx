
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Send, Smile, Paperclip, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useParams, useLocation, useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedUserId = id || searchParams.get("userId") || (location.state?.sellerId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  
  const sellerInfo = location.state || {};
  const { sellerName, sellerPhoto, itemId, itemTitle } = sellerInfo;
  
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "sarah",
      user: {
        name: "Sarah Smith",
        avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=Sarah"
      },
      lastMessage: "Does it come with the original leather case?",
      timestamp: "10:30 AM",
      unread: true,
      unreadCount: 2
    },
    {
      id: "mike",
      user: {
        name: "Mike Johnson",
        avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=Mike"
      },
      lastMessage: "Would you consider trading for a road bike?",
      timestamp: "Yesterday",
      unread: false
    },
    {
      id: "emma",
      user: {
        name: "Emma Wilson",
        avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=Emma"
      },
      lastMessage: "Great! See you tomorrow at 2 PM.",
      timestamp: "2 days ago",
      unread: false
    },
    {
      id: "david",
      user: {
        name: "David Chen",
        avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=David"
      },
      lastMessage: "Is the price negotiable?",
      timestamp: "3 days ago",
      unread: true,
      unreadCount: 1
    },
    {
      id: "sample-seller",
      user: {
        name: sellerName || "Sample Seller",
        avatar: sellerPhoto || "https://api.dicebear.com/7.x/avatars/svg?seed=Seller"
      },
      lastMessage: itemTitle ? `About: ${itemTitle}` : "Hi, I'm interested in your item",
      timestamp: "Just now",
      unread: false
    }
  ]);

  // If we have a sellerId from the location state but no id in the URL,
  // update the URL to include the seller ID for a better user experience
  useEffect(() => {
    if (location.state?.sellerId && !id) {
      navigate(`/messages/${location.state.sellerId}`, { 
        state: location.state,
        replace: true 
      });
    }
  }, [location.state, id, navigate]);

  useEffect(() => {
    // Add the seller to conversations if they don't exist yet
    if (selectedUserId && !conversations.some(c => c.id === selectedUserId)) {
      const newConversation = {
        id: selectedUserId,
        user: {
          name: sellerName || "Unknown Seller",
          avatar: sellerPhoto || `https://api.dicebear.com/7.x/avatars/svg?seed=${selectedUserId}`
        },
        lastMessage: itemTitle ? `About: ${itemTitle}` : "New conversation",
        timestamp: "Just now",
        unread: false
      };
      
      setConversations(prev => [...prev, newConversation]);
      console.log(`Added new conversation for seller ID: ${selectedUserId}`);
    }
  }, [selectedUserId, sellerName, sellerPhoto, itemTitle, conversations]);

  useEffect(() => {
    if (selectedUserId) {
      const selectedConversation = conversations.find(c => c.id === selectedUserId);
      
      if (selectedUserId === "sarah") {
        setMessages([
          { 
            text: "Hi! I'm interested in the vintage camera you posted. Is it still available?", 
            isMine: false,
            user: {
              name: "Sarah Smith",
              avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=Sarah"
            }
          },
          { 
            text: "Yes, it's still available! Would you like to see more photos?", 
            isMine: true,
            user: {
              name: "John Doe",
              avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=John"
            }
          },
          { 
            text: "That would be great! Does it come with the original leather case?", 
            isMine: false,
            user: {
              name: "Sarah Smith",
              avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=Sarah"
            }
          }
        ]);
      } else if (selectedUserId === "mike") {
        setMessages([
          { 
            text: "Hey, I saw your listing for the mountain bike. What's the frame size?", 
            isMine: false,
            user: {
              name: "Mike Johnson",
              avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=Mike"
            }
          },
          { 
            text: "It's a 19-inch frame, perfect for riders 5'9\" to 6'1\"", 
            isMine: true,
            user: {
              name: "John Doe",
              avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=John"
            }
          },
          { 
            text: "Would you consider trading for a road bike?", 
            isMine: false,
            user: {
              name: "Mike Johnson",
              avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=Mike"
            }
          }
        ]);
      } else if (selectedConversation || sellerName) {
        // For sample-seller or any other seller
        if (itemId && itemTitle) {
          setMessages([
            {
              text: `Hi! I'm interested in your item: ${itemTitle}`,
              isMine: true,
              user: {
                name: "John Doe", 
                avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=John"
              }
            }
          ]);
        } else {
          // Start with an empty conversation or a default message
          setMessages([
            {
              text: "Hi! I'm interested in connecting with you.",
              isMine: true,
              user: {
                name: "John Doe",
                avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=John"
              }
            }
          ]);
        }
      } else {
        // If no conversation exists and we have no seller info, show an error
        toast.error("Conversation not found");
        navigate('/messages');
      }
    } else {
      setMessages([]);
    }
  }, [selectedUserId, itemId, itemTitle, sellerName, navigate, conversations]);

  const selectConversation = (userId: string) => {
    navigate(`/messages/${userId}`);
  };

  const handleSendMessage = () => {
    if ((!newMessage.trim() && !attachment) || !selectedUserId) return;

    const message: Message = {
      text: newMessage,
      isMine: true,
      user: {
        name: "John Doe",
        avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=John"
      }
    };

    if (attachment) {
      const url = URL.createObjectURL(attachment);
      const type = attachment.type.startsWith('image/')
        ? 'image'
        : attachment.type.startsWith('video/')
        ? 'video'
        : 'file';
      
      message.attachment = {
        type,
        url,
        name: attachment.name
      };
    }

    setMessages(prev => [...prev, message]);
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
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error("File is too large. Maximum size is 10MB.");
      return;
    }

    setAttachment(file);
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar 
        title={selectedUserId 
          ? (conversations.find(c => c.id === selectedUserId)?.user.name || "Chat") 
          : "My Messages"
        } 
        showBackButton={true} 
        onBackClick={() => {
          if (selectedUserId) {
            navigate('/messages');
          } else {
            navigate(-1);
          }
        }}
      />
      
      <main className="flex-1 container mx-auto px-2 py-4 overflow-hidden flex flex-col pb-32">
        {!selectedUserId ? (
          <ScrollArea className="flex-1">
            <div className="space-y-1">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="bg-white rounded-lg p-3 shadow-sm cursor-pointer border hover:border-2 hover:border-red-500 transition-all"
                  onClick={() => selectConversation(conversation.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conversation.user.avatar} />
                      <AvatarFallback>{conversation.user.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`text-sm truncate ${conversation.unread ? 'font-bold' : 'font-medium'}`}>
                          {conversation.user.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          {conversation.unread && conversation.unreadCount && (
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                              {conversation.unreadCount}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">{conversation.timestamp}</span>
                        </div>
                      </div>
                      <p className={`text-xs text-muted-foreground truncate ${conversation.unread ? 'font-semibold' : ''}`}>
                        {conversation.lastMessage}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="space-y-3 pb-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex items-end gap-2 max-w-[85%]">
                      {!message.isMine && (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={message.user?.avatar} />
                          <AvatarFallback>{message.user?.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className="space-y-1">
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            message.isMine
                              ? 'border-2 border-red-500 text-black rounded-br-sm'
                              : 'text-black rounded-bl-sm'
                          }`}
                        >
                          {message.attachment && (
                            <div className="mb-2">
                              {message.attachment.type === "image" && (
                                <img 
                                  src={message.attachment.url} 
                                  alt="Attached"
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
                          {message.text && <span className="text-sm">{message.text}</span>}
                        </div>
                        {message.isMine && message.user && (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-xs text-muted-foreground">
                              {message.user.name}
                            </span>
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={message.user.avatar} />
                              <AvatarFallback>{message.user.name.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="fixed bottom-16 left-0 right-0 bg-white shadow-lg border-t">
              <div className="container mx-auto p-3">
                {attachment && (
                  <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg mb-2">
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
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
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

                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={handleAttachmentClick}
                  >
                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    accept="image/*,video/*,application/*"
                  />

                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />

                  <Button 
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() && !attachment}
                    className="h-9 w-9 rounded-full"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
};

export default Messages;
