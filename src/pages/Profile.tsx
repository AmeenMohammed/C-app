
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ItemGrid } from "@/components/ItemGrid";
import { Settings, ImagePlus, Phone, MapPin } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Link } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: "John Doe",
    bio: "Hello! I'm a passionate seller on this platform.",
    telephone: "+1 (234) 567-8900",
    location: "New York, NY"
  });

  const handleSave = () => {
    setIsEditing(false);
    // TODO: Implement save to backend
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TopBar title="Profile" />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <img
              src="https://images.unsplash.com/photo-1649972904349-6e44c42644a7"
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover"
            />
            <div className="flex-1">
              {isEditing ? (
                <Input 
                  value={profile.name}
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  className="mb-1"
                  placeholder="Your name"
                />
              ) : (
                <h2 className="text-xl font-semibold">{profile.name}</h2>
              )}
              <p className="text-muted-foreground">Member since 2024</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={isEditing ? "default" : "outline"} 
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              >
                {isEditing ? "Save" : "Edit"}
              </Button>
              {!isEditing && (
                <Link to="/settings">
                  <Button variant="outline" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Bio</label>
              {isEditing ? (
                <Textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  placeholder="Tell us about yourself"
                  className="resize-none"
                />
              ) : (
                <p className="text-sm text-muted-foreground">{profile.bio}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {isEditing ? (
                <Input
                  value={profile.telephone}
                  onChange={(e) => setProfile({...profile, telephone: e.target.value})}
                  placeholder="Your phone number"
                />
              ) : (
                <span className="text-sm">{profile.telephone}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {isEditing ? (
                <Input
                  value={profile.location}
                  onChange={(e) => setProfile({...profile, location: e.target.value})}
                  placeholder="Your location"
                />
              ) : (
                <span className="text-sm">{profile.location}</span>
              )}
            </div>
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
