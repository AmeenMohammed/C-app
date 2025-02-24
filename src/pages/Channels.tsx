
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Globe } from "lucide-react";
import { useState } from "react";

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
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChannels = SAMPLE_CHANNELS.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        
        <div className="space-y-3">
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
                  <p className="text-xs text-muted-foreground mt-1">{channel.members} members</p>
                </div>
                <Button variant={channel.isPrivate ? "outline" : "default"}>
                  {channel.isPrivate ? "Request Join" : "Join"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Channels;
