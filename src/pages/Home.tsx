import { ItemGrid } from "@/components/ItemGrid";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapPin, ExternalLink, Search } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { LoadingScreen } from "@/components/LoadingScreen";

const Home = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [range, setRange] = useState([parseInt(searchParams.get('range') || '5')]); // Get range from URL or default to 10km
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch categories dynamically
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useCategories();

  // Get user's location on component mount
  useEffect(() => {
    const getLocationWithPermissionCheck = async () => {
      // Check if we've already asked for location permission
      const locationPermission = localStorage.getItem('locationPermission');
      const savedLocation = localStorage.getItem('userLocation');

      // If user previously allowed and we have a saved location, use it
      if (locationPermission === 'granted' && savedLocation) {
        try {
          const location = JSON.parse(savedLocation);
          setUserLocation(location);
          return;
        } catch (error) {
          console.error("Error parsing saved location:", error);
          // Continue to request fresh location
        }
      }

      // If user previously denied, don't ask again
      if (locationPermission === 'denied') {
        return;
      }

      // If we haven't asked before or need fresh location, request it
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            setUserLocation(location);

            // Save permission granted and location
            localStorage.setItem('locationPermission', 'granted');
            localStorage.setItem('userLocation', JSON.stringify(location));
          },
          (error) => {
            console.error("Error getting location:", error);

            // Save that user denied permission
            localStorage.setItem('locationPermission', 'denied');
          }
        );
      }
    };

    getLocationWithPermissionCheck();
  }, []);

  const openLocationMap = () => {
    navigate(`/location-map?range=${range[0]}`);
  };

  if (categoriesLoading) {
    return <LoadingScreen message="Loading categories..." />;
  }

  if (categoriesError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error Loading Categories</h2>
          <p className="text-muted-foreground">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <TopBar title="Home" showBackButton={false} />

      {/* Categories Bar */}
      <div className="bg-background border-b sticky top-14 z-40">
        <div className="container mx-auto px-4">
          {/* Search Bar */}
          <div className="flex items-center gap-2 py-2 border-b">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-8"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 py-2">
            <TooltipProvider>
              {categories?.map((category) => {
                const IconComponent = category.iconComponent;
                return (
                  <Tooltip key={category.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={selectedCategory === category.id ? "default" : "outline"}
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => setSelectedCategory(category.id)}
                      >
                        <IconComponent className="h-4 w-4" />
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
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        <ItemGrid
          locationRange={range[0]}
          selectedCategory={selectedCategory}
          userLocation={userLocation}
          searchQuery={searchQuery}
        />
      </main>

      {/* Location Range Slider */}
      <div className="fixed bottom-16 left-0 right-0 bg-background shadow-lg border-t p-2">
        <div className="container mx-auto space-y-2">
          {/* Range Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={openLocationMap}
              className="h-8 w-8"
              title="Open location map"
            >
              <MapPin className="h-4 w-4 text-primary" />
            </Button>
            <div className="flex-1">
              <Slider
                value={range}
                onValueChange={setRange}
                max={30}
                min={1}
                step={1}
                className="flex-1"
              />
            </div>
            <span className="text-sm text-muted-foreground min-w-[3rem]">{range[0]}km</span>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
