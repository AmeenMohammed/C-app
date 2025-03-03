
import { ItemGrid } from "@/components/ItemGrid";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { MapPin, ExternalLink } from "lucide-react";

const Home = () => {
  const [range, setRange] = useState([10]); // Default 10km radius

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
    <div className="min-h-screen bg-gray-50 pb-24">
      <TopBar title="Home" showBackButton={false} />
      
      <main className="container mx-auto px-4 py-6">
        <ItemGrid />
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
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground min-w-[3rem]">{range}km</span>
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

export default Home;
