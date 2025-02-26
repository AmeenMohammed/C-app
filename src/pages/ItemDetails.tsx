import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eye, Pencil, ShoppingCart, Star } from "lucide-react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ItemDetails = () => {
  const location = useLocation();
  const isOwner = location.state?.fromProfile ?? false;
  const navigate = useNavigate();
  const sellerId = "mock-seller-id"; // TODO: Replace with actual seller ID
  const itemId = parseInt(location.pathname.split('/').pop() || "0");

  // Get view count
  const { data: viewCount } = useQuery({
    queryKey: ['itemViews', itemId],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_item_views', { item_uuid: itemId });
      return data || 0;
    },
  });

  // Track view
  useEffect(() => {
    const trackView = async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        await supabase.from('item_views').insert({
          item_id: itemId,
          viewer_id: user.id
        }).then(({ error }) => {
          if (error && error.code !== '23505') { // Ignore unique violation errors
            console.error('Error tracking view:', error);
          }
        });
      }
    };
    trackView();
  }, [itemId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar title="Item Details" />
      <main className="container mx-auto px-4 py-6 space-y-4">
        <Card className="overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d"
            alt="Item"
            className="w-full aspect-video object-cover"
          />
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-semibold">Vintage Camera</h1>
                <div className="flex items-center gap-4">
                  <p className="text-xl font-semibold text-primary">$299</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>{viewCount} views</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h2 className="font-semibold mb-2">Description</h2>
              <p className="text-muted-foreground">
                Beautiful vintage camera in excellent condition. Perfect for collectors or photography enthusiasts.
              </p>
            </div>
            <div>
              <h2 className="font-semibold mb-2">Seller</h2>
              <Link 
                to={`/seller/${sellerId}`}
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
                <Button size="sm" onClick={() => navigate('/messages')} className="w-full">
                  Contact Seller
                </Button>
                <Button size="sm" variant="outline" className="w-full">
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
