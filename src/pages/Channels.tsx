
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Globe, MapPin, ExternalLink, Users, Send, Smile } from "lucide-react";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import EmojiPicker, { EmojiStyle } from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";

interface Message {
  text: string;
  isMine: boolean;
  user?: {
    name: string;
    avatar?: string;
  };
}

interface Channel {
  id: number;
  name: string;
  description: string;
  members: number;
  isPrivate: boolean;
  messages?: Message[];
}

// Sample data - in a real app this would come from an API
const SAMPLE_CHANNELS: Channel[] = [
  {
    id: 1,
    name: "Local Marketplace",
    description: "Buy and sell items in your area",
    members: 1234,
    isPrivate: false,
    messages: [
      { text: "Welcome to the Local Marketplace!", isMine: false },
      { 
        text: "Hey everyone! Looking forward to trading here 👋", 
        isMine: true,
        user: {
          name: "John Doe",
          avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=John"
        }
      },
    ]
  },
  {
    id: 2,
    name: "Vintage Collectors",
    description: "For vintage item enthusiasts",
    members: 567,
    isPrivate: true,
  },
];

const Channels = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [range, setRange] = useState([10]); // Default 10km radius
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [channels, setChannels] = useState(SAMPLE_CHANNELS);

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJoinChannel = (channel: Channel) => {
    setActiveChannel(channel);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && activeChannel) {
      const updatedChannels = channels.map(channel => {
        if (channel.id === activeChannel.id) {
          return {
            ...channel,
            messages: [...(channel.messages || []), {
              text: newMessage,
              isMine: true,
              user: {
                name: "John Doe",
                avatar: "https://api.dicebear.com/7.x/avatars/svg?seed=John"
              }
            }]
          };
        }
        return channel;
      });
      setChannels(updatedChannels);
      setNewMessage("");
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
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

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TopBar 
        title={activeChannel ? activeChannel.name : "My Chat"} 
        showBackButton={!!activeChannel}
        onBackClick={() => setActiveChannel(null)}
      />
      
      {!activeChannel ? (
        // Channels List View
        <main className="container mx-auto px-4 py-6 space-y-4">
          <Input
            type="search"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
          
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="space-y-4">
              {filteredChannels.map(channel => (
                <Card key={channel.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{channel.name}</h3>
                        {channel.isPrivate ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Globe className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{channel.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{channel.members} members</span>
                      </div>
                    </div>
                    <Button 
                      variant={channel.isPrivate ? "outline" : "default"}
                      onClick={() => handleJoinChannel(channel)}
                    >
                      {channel.isPrivate ? "Request Join" : "Join"}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </main>
      ) : (
        // Channel Chat View
        <main className="flex-1 container mx-auto px-4 py-6 overflow-hidden flex flex-col h-[calc(100vh-160px)]">
          <ScrollArea className="flex-1 mb-16">
            <div className="space-y-4 pb-4">
              {activeChannel.messages?.map((message, index) => (
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

          {/* Message Input Box - Only shown when in a channel chat */}
          <div className="fixed bottom-16 left-0 right-0 bg-white shadow-lg border-t">
            <div className="container mx-auto p-3">
              <form onSubmit={sendMessage} className="flex items-center gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-50 border-0 focus-visible:ring-1"
                />
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" size="icon" variant="ghost">
                      <Smile className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-full" side="top" align="end">
                    <EmojiPicker 
                      onEmojiClick={onEmojiClick}
                      skinTonesDisabled
                      emojiStyle={EmojiStyle.APPLE}
                    />
                  </PopoverContent>
                </Popover>
                
                <Button type="submit" size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </main>
      )}

      {!activeChannel && (
        <div className="fixed bottom-16 left-0 right-0 bg-white shadow-lg border-t p-2">
          <div className="container mx-auto">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <Slider
                value={range}
                onValueChange={setRange}
                max={50}
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
      )}
      
      <BottomNav />
    </div>
  );
};

export default Channels;
