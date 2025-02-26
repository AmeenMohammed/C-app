
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";

const Messages = () => {
  const [searchParams] = useSearchParams();
  const channelId = searchParams.get("channel");
  const [messages, setMessages] = useState<{ text: string; isMine: boolean }[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // In a real app, you would fetch the channel details and messages here
  useEffect(() => {
    if (channelId) {
      // Example messages
      setMessages([
        { text: "Welcome to the channel!", isMine: false },
        { text: "Hey everyone! 👋", isMine: true },
      ]);
    }
  }, [channelId]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      setMessages([...messages, { text: newMessage, isMine: true }]);
      setNewMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TopBar title="Channel Chat" showBackButton={true} />
      <main className="container mx-auto px-4 py-6 flex flex-col h-[calc(100vh-160px)]">
        <ScrollArea className="flex-1 mb-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    message.isMine
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <form onSubmit={sendMessage} className="flex gap-2">
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
      </main>
      <BottomNav />
    </div>
  );
};

export default Messages;
