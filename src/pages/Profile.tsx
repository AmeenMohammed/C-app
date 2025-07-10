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
import { supabase } from "@/integrations/supabase/client";
import { LoadingScreen } from "@/components/LoadingScreen";
import avatar from "../assets/avatar.jpg";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

const Profile = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isEmailPublic, setIsEmailPublic] = useState(false);
  const [isPhonePublic, setIsPhonePublic] = useState(false);

  useEffect(() => {
    const fetchOrCreateProfile = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Try to fetch existing profile
        const { data: existingProfile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existingProfile && (!error || error.code === 'PGRST116')) {
          // No profile found, create one
          const newProfile = {
            user_id: user.id,
            full_name: user.user_metadata?.full_name ||
                     user.user_metadata?.name ||
                     user.email?.split('@')[0] ||
                     'User',
            avatar_url: user.user_metadata?.avatar_url ||
                       user.user_metadata?.picture || null,
            bio: 'Hello! I\'m new to this platform.',
            phone: user.phone || '',
            location: 'Location not set'
          };

          const { data: createdProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert(newProfile)
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
            toast.error('Failed to create profile');
          } else {
            setUserProfile(createdProfile);
          }
        } else if (existingProfile) {
          setUserProfile(existingProfile);
        } else if (error) {
          console.error('Error fetching profile:', error);
          toast.error('Failed to load profile');
        }
      } catch (error) {
        console.error('Error fetching/creating profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchOrCreateProfile();
  }, [user]);

  // Refetch profile data when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        // Refetch profile when page becomes visible
        const refetchProfile = async () => {
          const { data: updatedProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (updatedProfile) {
            setUserProfile(updatedProfile);
          }
        };
        refetchProfile();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const handleSave = async () => {
    if (!userProfile || !user) return;

    try {
      const { data: updatedProfile, error } = await supabase
        .from('user_profiles')
        .update({
          full_name: userProfile.full_name,
          bio: userProfile.bio,
          phone: userProfile.phone,
          location: userProfile.location,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        toast.error('Failed to update profile');
        console.error('Error updating profile:', error);
      } else {
        // Update local state with the saved data
        setUserProfile(updatedProfile);
        toast.success('Profile updated successfully');
        setIsEditing(false);
      }
    } catch (error) {
      toast.error('Failed to update profile');
      console.error('Error updating profile:', error);
    }
  };

  const toggleVisibility = (field: 'email' | 'phone') => {
    if (field === 'email') {
      setIsEmailPublic(!isEmailPublic);
    } else {
      setIsPhonePublic(!isPhonePublic);
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userProfile) return;

    // For now, just create a local URL. In production, you'd upload to Supabase storage
    const url = URL.createObjectURL(file);
    setUserProfile(prev => prev ? { ...prev, avatar_url: url } : null);
  };

  const getGoogleMapsUrl = (location: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  };

  if (loading) {
    return <LoadingScreen message="Loading profile..." />;
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 pb-16">
        <TopBar title="Profile" />
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <p className="text-muted-foreground">Failed to load profile</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TopBar title="Profile" />
      <main className="container mx-auto px-4 py-6">
        <Card className="p-6 mb-4">
          <div className="flex items-start gap-6 mb-3">
            <div className="relative">
              <img
                src={userProfile.avatar_url || avatar}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover"
                onError={(e) => {
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
                    value={userProfile.full_name || ''}
                    onChange={(e) => setUserProfile(prev => prev ? {...prev, full_name: e.target.value} : null)}
                    placeholder="Your name"
                  />
                ) : (
                  <>
                    <h2 className="text-2xl font-semibold">{userProfile.full_name || 'User'}</h2>
                    <p className="text-sm text-muted-foreground">
                      Member since {new Date(userProfile.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long'
                      })}
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
                  value={userProfile.bio || ''}
                  onChange={(e) => setUserProfile(prev => prev ? {...prev, bio: e.target.value} : null)}
                  placeholder="Tell us about yourself"
                  className="resize-none"
                />
              ) : (
                <p className="text-sm text-muted-foreground">{userProfile.bio}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm">{user?.email}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => toggleVisibility('email')}
              >
                {isEmailPublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                {isEditing ? (
                  <Input
                    value={userProfile.phone || ''}
                    onChange={(e) => setUserProfile(prev => prev ? {...prev, phone: e.target.value} : null)}
                    placeholder="Your phone number"
                  />
                ) : (
                  <span className="text-sm">{userProfile.phone || 'No phone number'}</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => toggleVisibility('phone')}
              >
                {isPhonePublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                {isEditing ? (
                  <Input
                    value={userProfile.location || ''}
                    onChange={(e) => setUserProfile(prev => prev ? {...prev, location: e.target.value} : null)}
                    placeholder="Your location"
                  />
                ) : (
                  <span className="text-sm">{userProfile.location}</span>
                )}
              </div>
              {!isEditing && userProfile.location && userProfile.location !== 'Location not set' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => window.open(getGoogleMapsUrl(userProfile.location!), '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">My Items</h3>
          <Link to="/post">
            <Button>
              <ImagePlus className="mr-2 h-4 w-4" />
              Post Item
            </Button>
          </Link>
        </div>


        {/* Show ItemGrid only if user is available */}
        {user?.id ? (
          <ItemGrid
            userId={user.id}
            isProfile={true}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading user information...</p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Profile;
