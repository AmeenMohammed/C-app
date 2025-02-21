
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ItemGrid } from "@/components/ItemGrid";
import { LogOut, Settings, ImagePlus } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Link } from "react-router-dom";

const Profile = () => {
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
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        <Link to="/post">
          <Card className="aspect-square flex flex-col items-center justify-center p-6 hover:bg-accent transition-colors cursor-pointer">
            <ImagePlus className="h-12 w-12 mb-4 text-primary" />
            <h3 className="text-lg font-semibold text-center">Post Your Item</h3>
            <p className="text-sm text-muted-foreground text-center mt-2">
              List something for sale
            </p>
          </Card>
        </Link>
        
        <Card className="p-6">
          <Button variant="outline" className="w-full" asChild>
            <div>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </div>
          </Button>
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
