
import { ItemGrid } from "@/components/ItemGrid";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { MapPin, ExternalLink, Sofa, Pill, ShoppingBag, Car, Laptop, Camera, Baby, Book, Shirt } from "lucide-react";

const categories = [
  { id: 'all', label: 'All', icon: ShoppingBag, description: 'All shopping items' },
  { id: 'furniture', label: 'Furniture', icon: Sofa, description: 'Home and office furniture' },
  { id: 'medicine', label: 'Medicine', icon: Pill, description: 'Medical and health items' },
  { id: 'electronics', label: 'Electronics', icon: Laptop, description: 'Electronic devices' },
  { id: 'vehicles', label: 'Vehicles', icon: Car, description: 'Cars and vehicles' },
  { id: 'cameras', label: 'Cameras', icon: Camera, description: 'Cameras and photography gear' },
  { id: 'baby', label: 'Baby Items', icon: Baby, description: 'Baby products and accessories' },
  { id: 'books', label: 'Books', icon: Book, description: 'Books and publications' },
  { id: 'fashion', label: 'Fashion', icon: Shirt, description: 'Clothing and accessories' },
];

const Home = () => {
  const [range, setRange] = useState([10]); // Default 10km radius
  const [selectedCategory, setSelectedCategory] = useState('all');

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
      
      {/* Categories Bar */}
      <div className="bg-white border-b sticky top-14 z-40">
        <div className="container mx-auto px-4">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex space-x-1 py-2">
              <TooltipProvider>
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <Tooltip key={category.id}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={selectedCategory === category.id ? "default" : "outline"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedCategory(category.id)}
                        >
                          <Icon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{category.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>

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
