import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ItemGrid } from "@/components/ItemGrid";
import { Settings, ImagePlus, Phone, MapPin, Mail, Eye, EyeOff, Camera, ExternalLink } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Link } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import avatar from "../assets/avatar.jpg";


const Profile = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: "User",
    bio: "Hello! I'm a passionate seller on this platform.",
    email: "user@example.com",
    telephone: "+1 (234) 567-8900",
    location: "New York, NY",
    isEmailPublic: false,
    isPhonePublic: false,
    photoUrl: avatar
  });

  useEffect(() => {
    if (user) {
      // Extract avatar URL with better fallback logic
      const googleAvatar = user.user_metadata?.avatar_url ||
                        user.user_metadata?.picture ||
                        user.identities?.[0]?.identity_data?.avatar_url ||
                        user.identities?.[0]?.identity_data?.picture;


      // Extract name with better priority
      const displayName = user.user_metadata?.full_name ||
                         user.user_metadata?.name ||
                         user.identities?.[0]?.identity_data?.full_name ||
                         user.identities?.[0]?.identity_data?.name ||
                         user.email?.split('@')[0] ||
                         "User";

      // Extract email with fallback
      const userEmail = user.email ||
                       user.user_metadata?.email ||
                       user.identities?.[0]?.identity_data?.email ||
                       "No email provided";

      // Extract phone (Google OAuth might not provide this)
      const userPhone = user.phone ||
                       user.user_metadata?.phone ||
                       user.identities?.[0]?.identity_data?.phone ||
                       "";

      // Extract location (Google OAuth might not provide this)
      const userLocation = user.user_metadata?.location ||
                          user.identities?.[0]?.identity_data?.location ||
                          "";

      setProfile(prev => ({
        ...prev,
        name: displayName,
        email: userEmail,
        telephone: userPhone,
        location: userLocation,
        photoUrl: googleAvatar,
      }));
    }
  }, [user]);

  const handleSave = () => {
    setIsEditing(false);
    toast.success("Profile updated successfully");
  };

  const toggleVisibility = (field: 'email' | 'phone') => {
    setProfile(prev => ({
      ...prev,
      [field === 'email' ? 'isEmailPublic' : 'isPhonePublic']:
      field === 'email' ? !prev.isEmailPublic : !prev.isPhonePublic
    }));
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setProfile(prev => ({ ...prev, photoUrl: url }));
    }
  };

  const getGoogleMapsUrl = (location: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TopBar title="Profile" />
      <main className="container mx-auto px-4 py-6">
        <Card className="p-6 mb-4">
          <div className="flex items-start gap-6 mb-3">
            <div className="relative">
              <img
                src={profile.photoUrl}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover"
                onError={(e) => {
                  // Fallback to default image if Google image fails to load
                  const target = e.target as HTMLImageElement;
                  target.src = avatar;
                }}
              />
              {isEditing && (
                <>
                  <button
                    onClick={handlePhotoClick}
                    className="absolute bottom-0 right-0 p-1.5 bg-primary rounded-full text-white hover:bg-primary/90 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </>
              )}
            </div>
            <div className="flex-1 flex items-start justify-between">
              <div className="space-y-1">
                {isEditing ? (
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    placeholder="Your name"
                  />
                ) : (
                  <>
                    <h2 className="text-2xl font-semibold">{profile.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      Member since {new Date().getFullYear()}
                    </p>
                    {user?.user_metadata?.provider && (
                      <p className="text-xs text-blue-600">
                        Signed in with {user.user_metadata.provider.charAt(0).toUpperCase() + user.user_metadata.provider.slice(1)}
                      </p>
                    )}
                  </>
                )}
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
          </div>

          <div className="space-y-1">
            <div className="mb-2">
              <label className="text-sm font-medium mb-0.5 block">Bio</label>
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
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                {isEditing ? (
                  <Input
                    value={profile.email}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                    placeholder="Your email address"
                    type="email"
                  />
                ) : (
                  <span className="text-sm">{profile.email}</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleVisibility('email')}
                className="h-8 w-8"
              >
                {profile.isEmailPublic ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                {isEditing ? (
                  <Input
                    value={profile.telephone}
                    onChange={(e) => setProfile({...profile, telephone: e.target.value})}
                    placeholder="Your phone number"
                  />
                ) : (
                  // Only show phone if present
                  profile.telephone && profile.telephone.trim() !== "" ? (
                    <span className="text-sm">{profile.telephone}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">No phone number</span>
                  )
                )}
              </div>
              {(isEditing || (profile.telephone && profile.telephone.trim() !== "")) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleVisibility('phone')}
                  className="h-8 w-8"
                >
                  {profile.isPhonePublic ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              {isEditing ? (
                <Input
                  value={profile.location}
                  onChange={(e) => setProfile({...profile, location: e.target.value})}
                  placeholder="Your location"
                />
              ) : (
                // Only show location if present
                profile.location && profile.location.trim() !== "" ? (
                  <div className="flex items-center gap-2 flex-1">
                    <a
                      href={getGoogleMapsUrl(profile.location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:text-primary transition-colors flex items-center gap-2"
                    >
                      {profile.location}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">No location</span>
                )
              )}
            </div>
          </div>
        </Card>

        <div className="mb-6">
          <Link to="/post">
            <Card className="w-full flex items-center gap-4 p-4 hover:border-primary transition-colors cursor-pointer">
              <ImagePlus className="h-8 w-8 text-primary" />
              <div className="flex-1">
                <h3 className="text-sm font-medium">Post Your Item</h3>
                <p className="text-xs text-muted-foreground">Share what you want to sell</p>
              </div>
            </Card>
          </Link>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">My Listings</h3>
          {user?.id ? (
            <ItemGrid userId={user.id} isProfile={true} />
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading your items...</p>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Profile;
