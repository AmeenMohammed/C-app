import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in React-Leaflet
interface LeafletIconDefault extends L.Icon.Default {
  _getIconUrl?: () => string;
}

delete (L.Icon.Default.prototype as LeafletIconDefault)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom component to handle map click events
function LocationSelector({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const CreateChannel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [channelName, setChannelName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [city, setCity] = useState(""); // Replace range with city
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [geocodeTimeout, setGeocodeTimeout] = useState<NodeJS.Timeout | null>(null);

  // Get user's location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);

          // Automatically populate city field with current location
          if (!city.trim()) { // Only populate if city field is empty
            setLocationLoading(true);
            try {
              const cityName = await reverseGeocode(location.lat, location.lng);
              setCity(cityName);
              toast.success("Current location detected and set automatically!");
            } catch (error) {
              console.error("Failed to get city name:", error);
            } finally {
              setLocationLoading(false);
            }
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Click 'Set Location on Map' to manually set your channel's location.");
          // Set a default location (New York) so the map can still work
          setUserLocation({ lat: 40.7128, lng: -74.0060 });
        }
      );
    }

    // Cleanup timeout on unmount
    return () => {
      if (geocodeTimeout) {
        clearTimeout(geocodeTimeout);
      }
    };
  }, []);

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`
      );
      const data = await response.json();

      if (data.address) {
        const { city, town, village, suburb, state, country } = data.address;
        // Build a readable address
        const cityName = city || town || village || suburb || 'Unknown Location';
        const stateName = state ? `, ${state}` : '';
        const countryName = country ? `, ${country}` : '';
        return `${cityName}${stateName}${countryName}`;
      }

      return `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const forwardGeocode = async (cityName: string): Promise<{lat: number, lng: number} | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        return { lat, lng };
      }

      return null;
    } catch (error) {
      console.error('Forward geocoding failed:', error);
      return null;
    }
  };

  const handleLocationChange = async (lat: number, lng: number) => {
    setUserLocation({ lat, lng });
    setLocationLoading(true);

    // Get city name from coordinates
    const cityName = await reverseGeocode(lat, lng);
    setCity(cityName);
    setLocationLoading(false);

    // Don't close the map automatically - let user confirm
    toast.success("Location updated! Click 'Confirm Location' when ready.");
  };

  const handleCityInputChange = async (value: string) => {
    setCity(value);

    // Clear any existing timeout
    if (geocodeTimeout) {
      clearTimeout(geocodeTimeout);
    }

    // First try to parse coordinates if user enters them (e.g., "40.7128, -74.0060")
    const coordPattern = /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/;
    const match = value.match(coordPattern);

    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);

      // Validate coordinates
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setUserLocation({ lat, lng });
        toast.success("Map updated with the entered coordinates.");
        return;
      }
    }

    // If not coordinates, set up debounced geocoding for city names
    if (value.trim().length >= 5) { // Increased from 2 to 5 characters
      const timeoutId = setTimeout(async () => {
        setLocationLoading(true);
        const coordinates = await forwardGeocode(value.trim());
        if (coordinates) {
          setUserLocation(coordinates);
          toast.success("Map updated with the city location.");
        }
        setLocationLoading(false);
      }, 1000); // Wait 1 second after user stops typing

      setGeocodeTimeout(timeoutId);
    }
  };

  const confirmLocation = () => {
    setShowLocationSelector(false);
    toast.success("Channel location confirmed successfully.");
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!channelName.trim()) {
      toast.error("Channel name is required");
      return;
    }

    if (!userLocation) {
      toast.error("Please set your channel's location on the map");
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
            latitude: userLocation.lat,
            longitude: userLocation.lng
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
                <Label htmlFor="city">Location</Label>
                <div className="space-y-2">
                  <Input
                    id="city"
                    placeholder="Enter your city or area"
                    value={city}
                    onChange={(e) => handleCityInputChange(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowLocationSelector(!showLocationSelector)}
                    className="w-full flex items-center gap-2"
                    disabled={locationLoading}
                  >
                    <MapPin className="h-4 w-4" />
                    {locationLoading ? "Finding Location..." : userLocation ? "Update Location on Map" : "Set Location on Map"}
                  </Button>

                  {userLocation && (
                    <div className="text-xs text-muted-foreground">
                      Current location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                    </div>
                  )}
                </div>

                {showLocationSelector && userLocation && (
                  <div className="border rounded-lg overflow-hidden" style={{ height: '350px' }}>
                    <MapContainer
                      center={[userLocation.lat, userLocation.lng]}
                      zoom={13}
                      style={{ height: '300px', width: '100%' }}
                      key={`${userLocation.lat}-${userLocation.lng}`}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <LocationSelector onLocationChange={handleLocationChange} />
                      <Marker position={[userLocation.lat, userLocation.lng]} />
                    </MapContainer>
                    <div className="p-2 bg-muted text-xs flex justify-between items-center">
                      <span>Click anywhere on the map to set your channel's location</span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={confirmLocation}
                        className="ml-2"
                      >
                        Confirm Location
                      </Button>
                    </div>
                  </div>
                )}
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
                  disabled={loading || !channelName.trim() || !userLocation}
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