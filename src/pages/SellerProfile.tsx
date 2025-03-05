import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/ui/card";
import { ItemGrid } from "@/components/ItemGrid";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { MapPin, Star, StarHalf } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase, checkBlockedUsersTable } from "@/integrations/supabase/client";
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

interface SellerRatings {
  average_rating: number;
  total_ratings: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
}

const SellerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [seller, setSeller] = useState({
    name: "",
    photoUrl: "",
    location: "",
    joinDate: "",
  });
  const [ratings, setRatings] = useState<SellerRatings | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [hasBlockedUsersTable, setHasBlockedUsersTable] = useState(false);

  useEffect(() => {
    const checkTable = async () => {
      const tableExists = await checkBlockedUsersTable();
      setHasBlockedUsersTable(tableExists);
    };
    
    checkTable();
  }, []);

  useEffect(() => {
    const fetchSellerDetails = async () => {
      if (!id) return;

      const { data: ratingData, error: ratingError } = await supabase
        .rpc('get_seller_ratings', { seller_uuid: id });

      if (ratingError) {
        console.error('Error fetching ratings:', ratingError);
      } else {
        setRatings(ratingData[0]);
      }

      if (hasBlockedUsersTable) {
        const user = (await supabase.auth.getUser()).data.user;
        if (user) {
          try {
            const { data, error } = await supabase
              .from('blocked_users_view')
              .select('is_blocked')
              .eq('blocker_id', user.id)
              .eq('blocked_id', id)
              .single();
            
            if (!error && data) {
              setIsBlocked(data.is_blocked);
            }
          } catch (error) {
            console.error('Error checking if user is blocked:', error);
          }
        }
      }

      setSeller({
        name: "John Doe",
        photoUrl: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7",
        location: "New York, NY",
        joinDate: "2024",
      });
    };

    fetchSellerDetails();
  }, [id, hasBlockedUsersTable]);

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-5 w-5 fill-primary text-primary" />);
    }

    if (hasHalfStar) {
      stars.push(<StarHalf key="half" className="h-5 w-5 text-primary" />);
    }

    return stars;
  };

  const handleContactSeller = () => {
    navigate(`/messages?userId=${id}`, { 
      state: { 
        sellerId: id,
        sellerName: seller.name,
        sellerAvatar: seller.photoUrl 
      } 
    });
  };

  const handleBlockUser = async () => {
    if (!hasBlockedUsersTable) {
      toast.error("This feature is not available");
      return;
    }
    
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      toast.error("You need to be logged in to block users");
      return;
    }

    try {
      if (isBlocked) {
        const { error } = await supabase
          .from('blocked_users')
          .delete()
          .eq('blocker_id', user.id)
          .eq('blocked_id', id);
        
        if (error) throw error;
        setIsBlocked(false);
        toast.success(`You've unblocked ${seller.name}`);
      } else {
        const { error } = await supabase
          .from('blocked_users')
          .insert({
            blocker_id: user.id,
            blocked_id: id
          });
        
        if (error) throw error;
        setIsBlocked(true);
        toast.success(`You've blocked ${seller.name}`);
      }
    } catch (error) {
      console.error('Error updating block status:', error);
      toast.error("Failed to update block status");
    }
    
    setIsBlockDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TopBar title="Seller Profile" showBackButton />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card className="p-6">
          <div className="flex items-start gap-6 mb-6">
            <img
              src={seller.photoUrl}
              alt={seller.name}
              className="w-24 h-24 rounded-full object-cover"
            />
            <div className="flex-1">
              <h2 className="text-2xl font-semibold">{seller.name}</h2>
              <p className="text-sm text-muted-foreground">Member since {seller.joinDate}</p>
              <div className="flex items-center gap-2 mt-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{seller.location}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex">{ratings && renderStars(ratings.average_rating)}</div>
                <span className="font-medium">{ratings?.average_rating || 0}</span>
                <span className="text-muted-foreground">
                  ({ratings?.total_ratings || 0} ratings)
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button 
              className="w-full"
              onClick={handleContactSeller}
            >
              Contact Seller
            </Button>
            
            {hasBlockedUsersTable && (
              <AlertDialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant={isBlocked ? "destructive" : "outline"}
                    className="w-full"
                  >
                    {isBlocked ? "Unblock User" : "Block User"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {isBlocked ? "Unblock this user?" : "Block this user?"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {isBlocked 
                        ? `You will start seeing ${seller.name}'s content again.`
                        : `You won't see ${seller.name}'s content anymore. They won't be notified that you've blocked them.`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBlockUser}>
                      {isBlocked ? "Unblock" : "Block"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </Card>

        <div>
          <h3 className="text-lg font-semibold mb-4">{seller.name}'s Items</h3>
          <ItemGrid userId={id} isProfile={true} />
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default SellerProfile;
