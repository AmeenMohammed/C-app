
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

const Messages = () => {
  const [searchParams] = useSearchParams();
  const channelId = searchParams.get("channel");
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
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
      },
      { 
        text: "Yes, it includes the original case and manual! 📸", 
        isMine: true,
        user: {
          name: "John Doe",
          avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=John"
        }
      },
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
      },
      { 
        text: "Not looking for trades at the moment, but thanks for the offer!", 
        isMine: true,
        user: {
          name: "John Doe",
          avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=John"
        }
      }
    ]);
  }, []); // Now the messages will load immediately when the component mounts

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar title="My Messages" showBackButton={true} />
      
      <main className="flex-1 container mx-auto px-4 py-6 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 mb-4">
          <div className="space-y-4 pb-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div className="flex items-end gap-2">
                  {!message.isMine && (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={message.user?.avatar} />
                      <AvatarFallback>{message.user?.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <div
                      className={`rounded-lg px-4 py-2 max-w-[80vw] ${
                        message.isMine
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary'
                      }`}
                    >
                      {message.text}
                    </div>
                    {message.isMine && message.user && (
                      <div className="flex items-center justify-end gap-1 mt-1">
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
      </main>
      
      <BottomNav />
    </div>
  );
};

export default Messages;
