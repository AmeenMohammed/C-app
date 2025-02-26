
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Send, Smile } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Message {
  text: string;
  isMine: boolean;
  user?: {
    name: string;
    avatar?: string;
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
}

const Messages = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedUserId = searchParams.get("userId");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "sarah",
      user: {
        name: "Sarah Smith",
        avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=Sarah"
      },
      lastMessage: "Does it come with the original leather case?",
      timestamp: "10:30 AM",
      unread: true
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
      unread: true
    }
  ]);

  useEffect(() => {
    if (selectedUserId) {
      // Load messages based on selected user
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
      }
    } else {
      setMessages([]);
    }
  }, [selectedUserId]);

  const selectConversation = (userId: string) => {
    setSearchParams({ userId });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar title="My Messages" showBackButton={selectedUserId !== null} />
      
      <main className="flex-1 container mx-auto px-2 py-4 overflow-hidden flex flex-col">
        {!selectedUserId ? (
          // Show conversation list when no user is selected
          <ScrollArea className="flex-1">
            <div className="space-y-1">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors border"
                  onClick={() => selectConversation(conversation.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conversation.user.avatar} />
                      <AvatarFallback>{conversation.user.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sm truncate">{conversation.user.name}</h3>
                        <span className="text-xs text-muted-foreground ml-2">{conversation.timestamp}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conversation.lastMessage}
                      </p>
                    </div>
                    {conversation.unread && (
                      <div className="h-2 w-2 bg-blue-500 rounded-full shrink-0"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          // Show messages when a user is selected
          <ScrollArea className="flex-1 mb-4">
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
                            ? 'bg-gray-900 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                        }`}
                      >
                        {message.text}
                      </div>
                      {message.isMine && message.user && (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[10px] text-muted-foreground">
                            {message.user.name}
                          </span>
                          <Avatar className="h-3 w-3">
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
        )}
      </main>
      
      <BottomNav />
    </div>
  );
};

export default Messages;
