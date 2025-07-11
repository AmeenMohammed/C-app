import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eye, Pencil, Star, BookmarkPlus } from "lucide-react";
import { useLocation, useNavigate, Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Item {
  id: string;
  title: string;
  price: number;
  category?: string;
  images: string[];
  description?: string;
  seller_id: string;
  location_range?: number;
}

interface Seller {
  id: string;
  user_id?: string;
  full_name: string;
  avatar_url: string | null;
  location: string;
}

const ItemDetails = () => {
  const { id: itemId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewCount, setViewCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOwner = user && item?.seller_id === user.id;
  const [itemFetchError, setItemFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItem = async () => {
      if (!itemId) return;

      try {
        setIsLoading(true);
        setError(null);

        // Check if it's a sample item
        // Only fetch real items from database
        // Fetch item from database
        const { data, error } = await supabase
            .from('items')
            .select('*')
            .eq('id', itemId)
            .single();

          if (error) {
            throw error;
          }

          if (data) {
            setItem(data as Item);

            // Fetch seller information
            const { data: sellerData, error: sellerError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('user_id', data.seller_id)
              .single();

            if (sellerError) {
              console.error('Error fetching seller:', sellerError);
              // Set default seller if profile not found
              setSeller({
                id: data.seller_id,
                full_name: "User",
                avatar_url: null,
                location: "Location not set"
              });
            } else {
              setSeller(sellerData as Seller);
            }

            // Fetch view count
            const { data: viewData } = await supabase.rpc('get_item_views', {
              item_uuid: itemId
            });
            setViewCount(viewData || 0);
          }
      } catch (error: unknown) {
        console.error('Error fetching item:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load item';
        setItemFetchError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItem();
  }, [itemId]);

  const trackView = async () => {
    if (!user || !itemId) return;

    try {
      await supabase.from('item_views').insert({
        item_id: itemId,
        viewer_id: user.id
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  useEffect(() => {
    if (user && itemId && !isOwner) {
      trackView();
    }
  }, [user, itemId, isOwner]);

  const handleSaveItem = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in to save items");
        navigate('/');
        return;
      }

      setSaving(true);
      setSaved(!saved);

      setTimeout(() => {
        setSaving(false);
      }, 500);

      console.log(`Item ${itemId} ${saved ? 'unsaved' : 'saved'} by user ${user.id}`);

    } catch (error) {
      console.error('Error saving item:', error);
      toast.error("Failed to save item");
    }
  };

  const handleContactSeller = () => {
    if (!seller || !item) return;

    navigate(`/messages?userId=${seller.user_id || seller.id}`, {
      state: {
        sellerId: seller.user_id || seller.id,
        sellerName: seller.full_name || "User",
        sellerAvatar: seller.avatar_url || "https://images.unsplash.com/photo-1649972904349-6e44c42644a7"
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopBar title="Item Details" />
        <div className="container mx-auto px-4 py-6 text-center">
          <p>Loading item details...</p>
        </div>
      </div>
    );
  }

  if (error || itemFetchError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopBar title="Item Details" />
        <div className="container mx-auto px-4 py-6 text-center">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-red-500 mb-2">Error Loading Item</h2>
            <p className="text-gray-600 mb-4">
              {itemFetchError || "This item doesn't exist or has been removed."}
            </p>
            <Button onClick={() => navigate('/home')}>Back to Home</Button>
          </Card>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopBar title="Item Details" />
        <div className="container mx-auto px-4 py-6 text-center">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Item Not Found</h2>
            <p className="text-gray-600 mb-4">
              The item you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/home')}>Back to Home</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar title="Item Details" />
      <main className="container mx-auto px-4 py-6 space-y-4">
        <Card className="overflow-hidden">
          <img
            src={item.images?.[0] || "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d"}
            alt={item.title}
            className="w-full aspect-video object-cover"
          />
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-semibold">{item.title}</h1>
                <div className="flex items-center gap-4">
                  <p className="text-xl font-semibold text-primary">${item.price}</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>{viewCount} views</span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSaveItem}
                className={`transition-transform duration-300 ${saving ? 'scale-150' : ''}`}
              >
                <BookmarkPlus className={`h-5 w-5 transition-all ${saving || saved ? 'text-primary fill-primary' : ''}`} />
              </Button>
            </div>
            <div>
              <h2 className="font-semibold mb-2">Description</h2>
              <p className="text-muted-foreground">
                {item.description || "No description provided"}
              </p>
            </div>
            <div>
              <h2 className="font-semibold mb-2">Seller</h2>
              <Link
                to={seller?.user_id ? `/seller/${seller.user_id}` : (seller?.id ? `/seller/${seller.id}` : '/home')}
                className="flex items-center space-x-3 p-2 rounded-lg border border-transparent transition-all duration-200 hover:border-primary/50"
              >
                <img
                  src={seller?.avatar_url || "https://images.unsplash.com/photo-1649972904349-6e44c42644a7"}
                  alt="Seller"
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{seller?.full_name || "User"}</p>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Star className="h-4 w-4 fill-primary text-primary mr-1" />
                      4.5
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {seller?.location || "Location not set"}
                  </p>
                </div>
              </Link>
            </div>
            {isOwner ? (
              <Button onClick={() => navigate(`/edit-item/${item.id}`)} variant="outline" className="w-full">
                <Pencil className="h-4 w-4 mr-2" />
                Edit Item
              </Button>
            ) : (
              <Button size="sm" onClick={handleContactSeller} className="w-full">
                Contact Seller
              </Button>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default ItemDetails;
