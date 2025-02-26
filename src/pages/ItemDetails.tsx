
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pencil, ShoppingCart } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const ItemDetails = () => {
  const location = useLocation();
  // Check if we're coming from the profile page
  const isOwner = location.state?.fromProfile ?? false;
  const navigate = useNavigate();

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
                <p className="text-xl font-semibold text-primary">$299</p>
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
              <div className="flex items-center space-x-3">
                <img
                  src="https://images.unsplash.com/photo-1649972904349-6e44c42644a7"
                  alt="Seller"
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium">John Doe</p>
                  <p className="text-sm text-muted-foreground">Member since 2024</p>
                </div>
              </div>
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
