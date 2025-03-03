import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eye, Pencil, ShoppingCart, Star, BookmarkPlus } from "lucide-react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ItemDetails = () => {
  const location = useLocation();
  const isOwner = location.state?.fromProfile ?? false;
  const navigate = useNavigate();
  const itemId = location.pathname.split('/').pop() || "0";
  const [itemFetchError, setItemFetchError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  console.log("Attempting to fetch item with ID:", itemId);

  const { data: item, isLoading, error } = useQuery({
    queryKey: ['item', itemId],
    queryFn: async () => {
      try {
        if (itemId === "1" || itemId === "2") {
          console.log("Using sample item data for ID:", itemId);
          return {
            id: itemId,
            title: itemId === "1" ? "Vintage Camera" : "Laptop Stand",
            price: itemId === "1" ? 299 : 49,
            images: [itemId === "1" 
              ? "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d" 
              : "https://images.unsplash.com/photo-1519389950473-47ba0277781c"],
            description: itemId === "1" 
              ? "A beautiful vintage camera in excellent condition." 
              : "Ergonomic laptop stand for better posture and comfort.",
            seller_id: "sample-seller"
          };
        }

        const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('id', itemId)
          .maybeSingle();

        if (error) {
          console.error("Supabase query error:", error);
          setItemFetchError(error.message);
          throw error;
        }
        
        if (!data) {
          console.error("No item found with ID:", itemId);
          setItemFetchError("Item not found");
          throw new Error("Item not found");
        }
        
        console.log("Successfully fetched item:", data);
        return data;
      } catch (err) {
        console.error("Error in queryFn:", err);
        throw err;
      }
    },
    retry: false
  });

  const { data: viewCount } = useQuery({
    queryKey: ['itemViews', itemId],
    queryFn: async () => {
      if (itemId === "1" || itemId === "2") {
        return Math.floor(Math.random() * 50) + 10;
      }
      
      const { data } = await supabase.rpc('get_item_views', { item_uuid: itemId });
      return data ?? 0;
    },
    enabled: !!item
  });

  useEffect(() => {
    const trackView = async () => {
      if (itemId === "1" || itemId === "2") return;
      
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        await supabase.from('item_views').insert({
          item_id: itemId,
          viewer_id: user.id
        }).then(({ error }) => {
          if (error && error.code !== '23505') {
            console.error('Error tracking view:', error);
          }
        });
      }
    };
    
    if (item) {
      trackView();
    }
  }, [itemId, item]);

  const handleAddToCart = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please sign in to add items to cart");
        navigate('/');
        return;
      }

      if (itemId === "1" || itemId === "2") {
        toast.success("Sample item added to cart", {
          duration: 2000
        });
        return;
      }

      const { error } = await supabase
        .from('cart_items')
        .upsert({
          user_id: user.id,
          item_id: itemId,
          quantity: 1
        }, {
          onConflict: 'user_id,item_id'
        });

      if (error) throw error;

      toast.success("Item added to cart", {
        duration: 2000
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error("Failed to add item to cart");
    }
  };

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
    const sellerId = item?.seller_id || "sample-seller";
    
    navigate(`/messages?userId=${sellerId}`, { 
      state: { 
        sellerId: sellerId,
        sellerName: "John Doe",
        sellerAvatar: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7" 
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
                to={item.seller_id === "sample-seller" ? '/home' : `/seller/${item.seller_id}`}
                className="flex items-center space-x-3 p-2 rounded-lg border border-transparent transition-all duration-200 hover:border-primary/50"
              >
                <img
                  src="https://images.unsplash.com/photo-1649972904349-6e44c42644a7"
                  alt="Seller"
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">John Doe</p>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Star className="h-4 w-4 fill-primary text-primary mr-1" />
                      4.5
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Member since 2024</p>
                </div>
              </Link>
            </div>
            {isOwner ? (
              <Button onClick={() => navigate('/edit-item')} variant="outline" className="w-full">
                <Pencil className="h-4 w-4 mr-2" />
                Edit Item
              </Button>
            ) : (
              <div className="space-y-2">
                <Button size="sm" onClick={handleContactSeller} className="w-full">
                  Contact Seller
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default ItemDetails;
