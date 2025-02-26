
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
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
  const [newMessage, setNewMessage] = useState("");

  // In a real app, you would fetch the channel details and messages here
  useEffect(() => {
    if (channelId) {
      setMessages([
        { text: "Welcome to the channel!", isMine: false },
        { 
          text: "Hey everyone! 👋", 
          isMine: true,
          user: {
            name: "John Doe",
            avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=John"
          }
        },
      ]);
    }
  }, [channelId]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      setMessages([...messages, { 
        text: newMessage, 
        isMine: true,
        user: {
          name: "John Doe",
          avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=John"
        }
      }]);
      setNewMessage("");
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar title="Channel Chat" showBackButton={true} />
      
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
                      <AvatarImage src="https://api.dicebear.com/7.x/avatars/svg?seed=Jane" />
                      <AvatarFallback>JD</AvatarFallback>
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
                          <AvatarFallback>JD</AvatarFallback>
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
      
      <div className="sticky bottom-16 bg-background border-t p-4 mx-auto w-full">
        <form onSubmit={sendMessage} className="container mx-auto flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" size="icon" variant="ghost">
                <Smile className="h-5 w-5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-full" side="top">
              <EmojiPicker onEmojiClick={onEmojiClick} />
            </PopoverContent>
          </Popover>
          
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default Messages;
