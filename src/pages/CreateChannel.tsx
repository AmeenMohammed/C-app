import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { MapPin, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const CreateChannel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [channelName, setChannelName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [range, setRange] = useState([10]); // Default 10km radius
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // Get user's location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Could not get your location. Channel will be created without location data.");
        }
      );
    }
  }, []);

  const openGoogleMaps = () => {
    if (userLocation) {
      const url = `https://www.google.com/maps/search/?api=1&query=${userLocation.lat},${userLocation.lng}`;
      window.open(url, '_blank');
    } else {
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
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!channelName.trim()) {
      toast.error("Channel name is required");
      return;
    }

    if (!range[0] || range[0] < 1) {
      toast.error("Please select a location range for your channel");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to create a channel");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('channels')
        .insert([
          {
            name: channelName.trim(),
            description: description.trim() || null,
            is_private: isPrivate,
            creator_id: user.id,
            latitude: userLocation?.lat || null,
            longitude: userLocation?.lng || null,
            location_range: range[0]
          }
        ]);

      if (error) {
        throw error;
      }

      toast.success("Channel created successfully!");
      navigate("/channels");
    } catch (error) {
      console.error('Error creating channel:', error);
      toast.error("Failed to create channel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TopBar
        title="Create Channel"
        showBackButton={true}
        onBackClick={() => navigate("/channels")}
      />

      <main className="container mx-auto px-4 py-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Create New Channel</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="channelName">Channel Name</Label>
                <Input
                  id="channelName"
                  type="text"
                  placeholder="Enter channel name"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter channel description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-range">Location Range</Label>
                <div className="flex items-center gap-2 mt-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <Slider
                    value={range}
                    onValueChange={setRange}
                    max={50}
                    min={1}
                    step={1}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={openGoogleMaps}
                    className="h-8 w-8"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-[3rem] text-right">
                    {range[0]}km
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="private-mode">Private Channel</Label>
                  <p className="text-sm text-muted-foreground">
                    {isPrivate
                      ? "Only invited members can join"
                      : "Anyone can discover and join"
                    }
                  </p>
                </div>
                <Switch
                  id="private-mode"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/channels")}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !channelName.trim() || !range[0]}
                  className="flex-1"
                >
                  {loading ? "Creating..." : "Create Channel"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

export default CreateChannel;