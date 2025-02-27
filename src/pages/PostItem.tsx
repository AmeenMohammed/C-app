
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, TrendingUp, MapPin, ExternalLink, X } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";

const PostItem = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const showBackButton = location.state?.from === 'profile';
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    price: "",
    description: "",
    range: [10] as number[], // Default 10km radius
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "Please sign in to post items",
          variant: "destructive",
        });
        navigate('/');
      }
    };
    checkAuth();
  }, [navigate]);

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
      // Removed the success toast notification
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please make sure you're signed in.",
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
    if (!formData.title || !formData.price || !formData.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase.from('items').insert({
        title: formData.title,
        price: parseFloat(formData.price),
        description: formData.description,
        location_range: formData.range[0],
        seller_id: session.user.id,
        images: images,
      });

      if (error) throw error;

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
      if (error instanceof Error && error.message === "Not authenticated") {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TopBar title="Post New Item" showBackButton={showBackButton} />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card className="p-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Photos</label>
              <div className="border-2 border-dashed rounded-lg p-4">
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {images.map((url, index) => (
                    <div key={index} className="relative w-20 h-20">
                      <img 
                        src={url} 
                        alt={`Item ${index + 1}`}
                        className="w-full h-full object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-1 -right-1 p-0.5 bg-white rounded-full shadow-md hover:bg-gray-100"
                      >
                        <X className="h-3 w-3 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    ref={fileInputRef}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mx-auto text-sm"
                    disabled={loading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Add Photos
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input 
                placeholder="What are you selling?"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
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
              />
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

            <Card 
              className="w-full flex items-center gap-4 p-4 hover:bg-accent transition-colors cursor-pointer bg-gray-50 border-primary/10 shadow-sm"
              onClick={handlePromoteItem}
            >
              <div className="rounded-full bg-primary/5 p-2">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">Move to Top</h3>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">10 EGP</span>
                </div>
                <p className="text-xs text-muted-foreground">Promote your items for more visibility</p>
              </div>
            </Card>

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Posting..." : "Post Item"}
            </Button>
          </form>
        </Card>
      </main>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Payment Method</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            {[
              { name: "Fawry", icon: "💳" },
              { name: "Visa", icon: "💳" },
              { name: "Instapay", icon: "🏦" },
              { name: "App Wallet", icon: "👝" },
            ].map((method) => (
              <Button
                key={method.name}
                variant="outline"
                className="w-full justify-start text-left"
                onClick={() => handlePayment(method.name)}
              >
                <span className="mr-2">{method.icon}</span>
                {method.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default PostItem;
