
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ItemGrid } from "@/components/ItemGrid";
import { Settings, ImagePlus, TrendingUp } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";

const Profile = () => {
  const handlePromoteItem = () => {
    // In a real app, this would integrate with a payment system
    toast({
      title: "Promotion Started",
      description: "Your item will be moved to the top after payment confirmation.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TopBar title="Profile" />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <img
              src="https://images.unsplash.com/photo-1649972904349-6e44c42644a7"
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover"
            />
            <div className="flex-1">
              <h2 className="text-xl font-semibold">John Doe</h2>
              <p className="text-muted-foreground">Member since 2024</p>
            </div>
            <Link to="/settings">
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>

        <Link to="/post">
          <Card className="w-full flex items-center gap-4 p-4 hover:bg-accent transition-colors cursor-pointer">
            <ImagePlus className="h-8 w-8 text-primary" />
            <div className="flex-1">
              <h3 className="text-sm font-medium">Post Your Item</h3>
              <p className="text-xs text-muted-foreground">Share what you want to sell</p>
            </div>
          </Card>
        </Link>

        <Card 
          className="w-full flex items-center gap-4 p-4 hover:bg-accent transition-colors cursor-pointer bg-gradient-to-r from-primary/5 to-primary/10"
          onClick={handlePromoteItem}
        >
          <TrendingUp className="h-8 w-8 text-primary" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Move to Top</h3>
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">10 EGP</span>
            </div>
            <p className="text-xs text-muted-foreground">Promote your items for more visibility</p>
          </div>
        </Card>

        <div>
          <h3 className="text-lg font-semibold mb-4">My Listings</h3>
          <ItemGrid />
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Profile;
