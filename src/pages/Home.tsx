
import { ItemGrid } from "@/components/ItemGrid";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import { MapPin } from "lucide-react";

const Home = () => {
  const [range, setRange] = useState([10]); // Default 10km radius

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <TopBar title="Home" showBackButton={false} />
      <main className="container mx-auto px-4 py-6">
        <ItemGrid />
      </main>
      
      {/* Location Range Slider */}
      <div className="fixed bottom-16 left-0 right-0 bg-white shadow-lg border-t p-4">
        <div className="container mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Location Range: {range[0]}km</span>
          </div>
          <Slider
            value={range}
            onValueChange={setRange}
            max={50}
            min={1}
            step={1}
            className="w-full"
          />
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default Home;
