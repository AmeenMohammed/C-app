import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, X, Trash2, Sofa, Pill, ShoppingBag, Car, Laptop, Camera, Baby, Book, Shirt } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";

const categories = [
  { id: 'furniture', label: 'Furniture', icon: Sofa, description: 'Home and office furniture' },
  { id: 'medicine', label: 'Medicine', icon: Pill, description: 'Medical and health items' },
  { id: 'electronics', label: 'Electronics', icon: Laptop, description: 'Electronic devices' },
  { id: 'vehicles', label: 'Vehicles', icon: Car, description: 'Cars and vehicles' },
  { id: 'cameras', label: 'Cameras', icon: Camera, description: 'Cameras and photography gear' },
  { id: 'baby', label: 'Baby Items', icon: Baby, description: 'Baby products and accessories' },
  { id: 'books', label: 'Books', icon: Book, description: 'Books and publications' },
  { id: 'fashion', label: 'Fashion', icon: Shirt, description: 'Clothing and accessories' },
];

interface Item {
  id: string;
  title: string;
  price: number;
  description?: string;
  category: string;
  images: string[];
  seller_id: string;
  location_range: number;
}

const EditItem = () => {
  const { id: itemId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [item, setItem] = useState<Item | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    price: "",
    description: "",
    category: "",
    range: 10,
  });

  useEffect(() => {
    const fetchItem = async () => {
      if (!itemId || !user) return;

      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('id', itemId)
          .eq('seller_id', user.id) // Ensure user owns the item
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            toast({
              title: "Item not found",
              description: "This item doesn't exist or you don't have permission to edit it",
              variant: "destructive",
            });
            navigate('/profile');
            return;
          }
          throw error;
        }

        setItem(data);
        setImages(data.images || []);
        setFormData({
          title: data.title || "",
          price: data.price?.toString() || "",
          description: data.description || "",
          category: data.category || "",
          range: data.location_range || 10,
        });
      } catch (error) {
        console.error('Error fetching item:', error);
        toast({
          title: "Error loading item",
          description: "Failed to load item details",
          variant: "destructive",
        });
        navigate('/profile');
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [itemId, user, navigate]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSaving(true);
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
      toast({
        title: "Image uploaded",
        description: "New image added successfully",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.price || !formData.category || !item) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('items')
        .update({
          title: formData.title,
          price: parseFloat(formData.price),
          description: formData.description,
          category: formData.category,
          location_range: formData.range,
          images: images,
        })
        .eq('id', item.id)
        .eq('seller_id', user?.id); // Double-check ownership

      if (error) throw error;

      toast({
        title: "Success",
        description: "Item updated successfully",
      });
      navigate('/profile');
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update item",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item || !confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', item.id)
        .eq('seller_id', user?.id); // Double-check ownership

      if (error) throw error;

      toast({
        title: "Item deleted",
        description: "Your item has been removed successfully",
      });
      navigate('/profile');
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading item..." />;
  }

  if (!item) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TopBar title="Edit Item" showBackButton />
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
                    disabled={saving}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mx-auto text-sm"
                    disabled={saving}
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
                step="1"
                placeholder="0"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              />
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDelete}
                disabled={deleting || saving}
                className="flex-1"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleting ? "Deleting..." : "Delete Item"}
              </Button>
              <Button 
                type="submit" 
                disabled={saving || deleting}
                className="flex-1"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Card>
      </main>
      <BottomNav />
    </div>
  );
};

export default EditItem;