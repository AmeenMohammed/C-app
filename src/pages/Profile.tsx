
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ItemGrid } from "@/components/ItemGrid";
import { LogOut, Settings } from "lucide-react";

const Profile = () => {
  return (
    <div className="min-h-screen bg-gray-50">
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
          
          <div className="mt-6 pt-6 border-t">
            <Button variant="outline" className="w-full" asChild>
              <div>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </div>
            </Button>
          </div>
        </Card>

        <div>
          <h3 className="text-lg font-semibold mb-4">My Listings</h3>
          <ItemGrid />
        </div>
      </main>
    </div>
  );
};

export default Profile;
