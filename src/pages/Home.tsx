
import { ItemGrid } from "@/components/ItemGrid";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useState } from "react";
import { MapPin, ExternalLink, Sofa, Pill, ShoppingBag, Car, Laptop, Camera, Baby, Book, Shirt } from "lucide-react";

const categories = [
  { id: 'all', label: 'All', icon: ShoppingBag },
  { id: 'furniture', label: 'Furniture', icon: Sofa },
  { id: 'medicine', label: 'Medicine', icon: Pill },
  { id: 'electronics', label: 'Electronics', icon: Laptop },
  { id: 'vehicles', label: 'Vehicles', icon: Car },
  { id: 'cameras', label: 'Cameras', icon: Camera },
  { id: 'baby', label: 'Baby Items', icon: Baby },
  { id: 'books', label: 'Books', icon: Book },
  { id: 'fashion', label: 'Fashion', icon: Shirt },
];

const Home = () => {
  const [range, setRange] = useState([10]); // Default 10km radius
  const [selectedCategory, setSelectedCategory] = useState('all');

  const openGoogleMaps = () => {
    // Default to current location if available, otherwise use a default location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        window.open(url, '_blank');
      },
      // If geolocation is denied, use a default location or show error
      (error) => {
        console.error("Error getting location:", error);
        // Open maps without specific location
        window.open('https://www.google.com/maps', '_blank');
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <TopBar title="Home" showBackButton={false} />
      
      {/* Categories Bar */}
      <div className="bg-white border-b sticky top-14 z-40">
        <div className="container mx-auto px-4">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex space-x-2 py-4">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    className="flex items-center gap-2"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <Icon className="h-4 w-4" />
                    {category.label}
                  </Button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        <ItemGrid />
      </main>
      
      {/* Location Range Slider */}
      <div className="fixed bottom-16 left-0 right-0 bg-white shadow-lg border-t p-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Location Range: {range[0]}km</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={openGoogleMaps}
              className="flex items-center gap-1"
            >
              Open Maps
              <ExternalLink className="h-4 w-4 ml-1" />
            </Button>
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
