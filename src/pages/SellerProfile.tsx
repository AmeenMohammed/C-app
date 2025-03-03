
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ItemGrid } from "@/components/ItemGrid";
import { Shield, UserX } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SellerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUserId(data.user.id);
        checkIfBlocked(data.user.id);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const fetchSellerInfo = async () => {
      try {
        // Here we would normally fetch the seller data
        // For now, let's use dummy data
        setTimeout(() => {
          setSeller({
            id: id,
            name: "John Doe",
            avatar: "/lovable-uploads/e6019a3b-61c9-4472-b3d8-808cef7cf0f2.png",
            rating: 4.8,
            reviews: 23,
            joinDate: "June 2022",
            listings: 12
          });
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error("Error fetching seller:", error);
        setLoading(false);
      }
    };

    if (id) {
      fetchSellerInfo();
    }
  }, [id]);

  const checkIfBlocked = async (userId: string) => {
    if (!id) return;
    
    try {
      // Check if user has blocked this seller
      const { data, error } = await supabase
        .from('blocked_users')
        .select('*')
        .eq('user_id', userId)
        .eq('blocked_user_id', id);
      
      if (error) throw error;
      
      setIsBlocked(data && data.length > 0);
    } catch (error) {
      console.error("Error checking block status:", error);
    }
  };

  const handleContactSeller = () => {
    if (!currentUserId) {
      toast.error("You need to be logged in to contact sellers");
      navigate("/");
      return;
    }
    
    if (isBlocked) {
      toast.error("You have blocked this seller");
      return;
    }
    
    // Navigate to the messages page with the seller ID
    navigate(`/messages?seller=${id}`);
  };

  const handleBlockUser = async () => {
    if (!currentUserId || !id) return;
    
    try {
      // Insert a record in the blocked_users table
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          user_id: currentUserId,
          blocked_user_id: id
        });
      
      if (error) throw error;
      
      setIsBlocked(true);
      toast.success("User blocked successfully");
    } catch (error) {
      console.error("Error blocking user:", error);
      toast.error("Failed to block user");
    }
  };

  const handleUnblockUser = async () => {
    if (!currentUserId || !id) return;
    
    try {
      // Delete the record from blocked_users table
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('user_id', currentUserId)
        .eq('blocked_user_id', id);
      
      if (error) throw error;
      
      setIsBlocked(false);
      toast.success("User unblocked successfully");
    } catch (error) {
      console.error("Error unblocking user:", error);
      toast.error("Failed to unblock user");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-16">
        <TopBar title="Seller Profile" showBackButton={true} />
        <main className="container mx-auto px-4 py-6">
          <div className="animate-pulse">
            <div className="h-20 bg-gray-200 rounded mb-4"></div>
            <div className="h-40 bg-gray-200 rounded mb-4"></div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-gray-50 pb-16">
        <TopBar title="Seller Profile" showBackButton={true} />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <h2 className="text-xl font-medium">Seller not found</h2>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TopBar title="Seller Profile" showBackButton={true} />
      <main className="container mx-auto px-4 py-6">
        <Card className="mb-6 p-6">
          <div className="flex items-center mb-4">
            <div className="relative">
              <img
                src={seller.avatar}
                alt={seller.name}
                className="w-16 h-16 rounded-full object-cover"
              />
              {seller.verified && (
                <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-1">
                  <Shield className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div className="ml-4">
              <h2 className="text-xl font-semibold">{seller.name}</h2>
              <div className="flex items-center text-sm text-gray-500">
                <span>⭐ {seller.rating}</span>
                <span className="mx-2">•</span>
                <span>{seller.reviews} reviews</span>
              </div>
              <p className="text-sm text-gray-500">Member since {seller.joinDate}</p>
            </div>
          </div>
          
          <div className="flex space-x-3 mt-4">
            <Button 
              className="flex-1" 
              onClick={handleContactSeller}
            >
              Contact Seller
            </Button>
            
            {currentUserId && currentUserId !== id && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant={isBlocked ? "outline" : "destructive"} size="icon">
                    <UserX className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {isBlocked ? "Unblock this user?" : "Block this user?"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {isBlocked 
                        ? "You will start seeing their listings and they will be able to contact you."
                        : "You won't see their listings and they won't be able to contact you."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={isBlocked ? handleUnblockUser : handleBlockUser}
                      className={isBlocked ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
                    >
                      {isBlocked ? "Unblock" : "Block"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </Card>

        <h3 className="text-lg font-medium mb-4">{seller.name}'s Listings ({seller.listings})</h3>
        <ItemGrid />
      </main>
      <BottomNav />
    </div>
  );
};

export default SellerProfile;
