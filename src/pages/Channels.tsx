
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Globe, MapPin, ExternalLink, Users } from "lucide-react";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";

// Sample data - in a real app this would come from an API
const SAMPLE_CHANNELS = [
  {
    id: 1,
    name: "Local Marketplace",
    description: "Buy and sell items in your area",
    members: 1234,
    isPrivate: false,
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
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [range, setRange] = useState([10]); // Default 10km radius

  const filteredChannels = SAMPLE_CHANNELS.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJoinChannel = (channelId: number) => {
    // In a real app, you would handle the join logic here
    // For now, we'll just navigate to the messages page with the channel ID
    navigate(`/messages?channel=${channelId}`);
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
      <TopBar title="Channels" />
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
                    onClick={() => handleJoinChannel(channel.id)}
                  >
                    {channel.isPrivate ? "Request Join" : "Join"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </main>

      {/* Location Range Slider */}
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
      
      <BottomNav />
    </div>
  );
};

export default Channels;
