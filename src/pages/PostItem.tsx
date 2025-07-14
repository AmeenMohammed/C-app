import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, TrendingUp, MapPin, ExternalLink, X } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCategories } from "@/hooks/useCategories";
import { LoadingScreen } from "@/components/LoadingScreen";

const PostItem = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const showBackButton = location.state?.from === 'profile';
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    price: "",
    description: "",
    category: "",
    range: [10] as number[], // Default 10km radius
    listingType: "sell" as "sell" | "rent" | "request",
  });
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // Fetch categories dynamically
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useCategories();

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
          toast({
            title: "Location Error",
            description: "Could not get your location. Items will be posted without location data.",
            variant: "destructive",
          });
        }
      );
    }
  }, []);

  const handlePromoteItem = () => {
    setShowPaymentDialog(true);
  };

  const handlePayment = (method: string) => {
    setShowPaymentDialog(false);
    toast({
      title: "Processing Payment",
      description: `Processing payment via ${method}...`,
    });
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch('https://vttanwzodshofhycuqjr.functions.supabase.co/upload-item-image', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setImages(prev => [...prev, data.url]);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.price || !formData.description || !formData.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields including category",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to post items",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Try to insert with category_id first, fallback to category if needed
      const itemData = {
        title: formData.title,
        price: parseFloat(formData.price),
        description: formData.description,
        location_range: formData.range[0],
        latitude: userLocation?.lat || null,
        longitude: userLocation?.lng || null,
        seller_id: user.id,
        images: images,
      };

      // Try inserting with category_id first
      const { error } = await supabase.from('items').insert({
        ...itemData,
        category_id: formData.category,
      });

      // If that fails, try with the old category field
      if (error && error.code === '42703') { // Column doesn't exist
        const { error: fallbackError } = await supabase.from('items').insert({
          ...itemData,
          category: formData.category,
        });

        if (fallbackError) throw fallbackError;
      } else if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Item posted successfully",
      });
      navigate('/profile');
    } catch (error) {
      console.error('Post error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to post item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (categoriesLoading) {
    return <LoadingScreen message="Loading categories..." />;
  }

  if (categoriesError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error Loading Categories</h2>
          <p className="text-muted-foreground">Please try again later</p>
        </div>
      </div>
    );
  }

  // Filter out the "All" category for posting
  const postCategories = categories?.filter(cat => cat.id !== 'all') || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <TopBar title="Post Item" showBackButton={showBackButton} />

      <div className="container mx-auto px-4 py-6">
        <Card className="max-w-2xl mx-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Images</label>
              <div className="grid grid-cols-3 gap-2">
                {images.map((image, index) => (
                  <div key={index} className="relative">
                    <img src={image} alt={`Upload ${index + 1}`} className="w-full h-24 object-cover rounded" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="h-24 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  <ImagePlus className="h-6 w-6" />
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="What are you selling?"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Price</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {postCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <category.iconComponent className="h-4 w-4" />
                        <span>{category.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Location Range</label>
              <div className="flex items-center gap-2 mt-2">
                <MapPin className="h-4 w-4 text-primary" />
                <Slider
                  value={formData.range}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, range: value }))}
                  max={50}
                  min={1}
                  step={1}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={openGoogleMaps}
                  className="h-8 w-8"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground min-w-[3rem] text-right">
                  {formData.range[0]}km
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Describe your item..."
                className="min-h-[100px]"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Posting..." : "Post Item"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handlePromoteItem}
                className="flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Promote
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <BottomNav />

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote Your Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Boost your item's visibility by promoting it to the top of search results.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => handlePayment('PayPal')}>
                Pay with PayPal
              </Button>
              <Button onClick={() => handlePayment('Card')}>
                Pay with Card
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostItem;
