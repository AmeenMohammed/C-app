
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Globe, MapPin, ExternalLink, Users, Send, Smile, Search, Paperclip, X } from "lucide-react";
import { useState, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmojiPicker from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";
import { toast } from "sonner";

interface MessageAttachment {
  type: "image" | "video" | "file";
  url: string;
  name?: string;
}

interface Message {
  text: string;
  isMine: boolean;
  user?: {
    name: string;
    avatar?: string;
  };
  attachment?: MessageAttachment;
}

interface Channel {
  id: number;
  name: string;
  description: string;
  members: number;
  isPrivate: boolean;
  isJoined?: boolean;
  unreadCount?: number;
  messages?: Message[];
}

const SAMPLE_CHANNELS: Channel[] = [
  {
    id: 1,
    name: "Local Marketplace",
    description: "Buy and sell items in your area",
    members: 1234,
    isPrivate: false,
    isJoined: true,
    unreadCount: 3,
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
    isJoined: true,
    unreadCount: 1
  },
  {
    id: 3,
    name: "Tech Gadgets Exchange",
    description: "Trade and discuss latest tech gadgets",
    members: 892,
    isPrivate: false,
    isJoined: true,
    messages: []
  },
  {
    id: 4,
    name: "Premium Sellers",
    description: "Exclusive channel for verified sellers",
    members: 234,
    isPrivate: true,
    isJoined: false
  },
  {
    id: 5,
    name: "Furniture Exchange",
    description: "Buy, sell, and trade furniture items",
    members: 756,
    isPrivate: false,
    isJoined: false
  },
  {
    id: 6,
    name: "Rare Collectibles",
    description: "For collectors of rare and unique items",
    members: 445,
    isPrivate: true,
    isJoined: false
  },
  {
    id: 7,
    name: "Sports Equipment",
    description: "Trading sports and fitness gear",
    members: 1567,
    isPrivate: false,
    isJoined: false
  },
  {
    id: 8,
    name: "Books & Comics",
    description: "Exchange books, comics, and magazines",
    members: 2341,
    isPrivate: false,
    isJoined: false
  },
  {
    id: 9,
    name: "Art Gallery",
    description: "Buy and sell original artwork",
    members: 890,
    isPrivate: true,
    isJoined: false
  },
  {
    id: 10,
    name: "Musical Instruments",
    description: "Trading musical instruments and equipment",
    members: 678,
    isPrivate: false,
    isJoined: false
  },
  {
    id: 11,
    name: "Photography Gear",
    description: "Exchange cameras and photography equipment",
    members: 445,
    isPrivate: false,
    isJoined: false
  },
  {
    id: 12,
    name: "Antique Dealers",
    description: "Premium channel for antique traders",
    members: 223,
    isPrivate: true,
    isJoined: false
  }
];

const Channels = () => {
  const [discoverSearchQuery, setDiscoverSearchQuery] = useState("");
  const [joinedSearchQuery, setJoinedSearchQuery] = useState("");
  const [range, setRange] = useState([10]); // Default 10km radius
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [channels, setChannels] = useState(SAMPLE_CHANNELS);
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleJoinChannel = (channel: Channel) => {
    setActiveChannel(channel);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachment) || !activeChannel) return;

    const newMsg: Message = {
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
      
      newMsg.attachment = {
        type,
        url,
        name: attachment.name
      };
    }

    const updatedChannels = channels.map(channel => {
      if (channel.id === activeChannel.id) {
        return {
          ...channel,
          messages: [...(channel.messages || []), newMsg]
        };
      }
      return channel;
    });
    setChannels(updatedChannels);
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
    // Removed the success toast notification
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

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
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
                Joined
                {filteredJoinedChannels.some(c => c.unreadCount) && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {filteredJoinedChannels.filter(c => c.unreadCount).length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="discover" className="mt-4">
              <div className="space-y-4">
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
                    {filteredChannels.map(channel => (
                      <Card 
                        key={channel.id} 
                        className="p-4 cursor-pointer hover:border-2 hover:border-red-500 transition-all"
                        onClick={() => handleJoinChannel(channel)}
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
                          >
                            {channel.isPrivate ? "Request Join" : "Join"}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>

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
                    {filteredJoinedChannels.map(channel => (
                      <Card 
                        key={channel.id} 
                        className={`p-4 cursor-pointer hover:border-2 hover:border-red-500 transition-all ${
                          channel.unreadCount ? 'border-2 border-red-500' : ''
                        }`}
                        onClick={() => handleJoinChannel(channel)}
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
                          <Button variant="outline">
                            Joined
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      ) : (
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
                            ? 'border-2 border-red-500 text-black'
                            : 'text-black'
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
                      sendMessage(e);
                    }
                  }}
                />

                <Button 
                  size="icon"
                  onClick={sendMessage}
                  disabled={!newMessage.trim() && !attachment}
                  className="h-9 w-9 rounded-full"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </main>
      )}
      
      <BottomNav />
    </div>
  );
};

export default Channels;
