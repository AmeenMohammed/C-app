
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { SellerHeader } from "@/components/seller/SellerHeader";
import { SellerActions } from "@/components/seller/SellerActions";
import { SellerItems } from "@/components/seller/SellerItems";

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
  const [seller, setSeller] = useState({
    name: "",
    photoUrl: "",
    location: "",
    joinDate: "",
  });
  const [ratings, setRatings] = useState<SellerRatings | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const fetchSellerDetails = async () => {
      if (!id) return;

      // Fetch seller ratings
      const { data: ratingData, error: ratingError } = await supabase
        .rpc('get_seller_ratings', { seller_uuid: id });

      if (ratingError) {
        console.error('Error fetching ratings:', ratingError);
      } else if (ratingData && ratingData.length > 0) {
        setRatings(ratingData[0]);
      }

      // Check if seller is blocked using the RPC function
      const user = (await supabase.auth.getUser()).data.user;
      if (user && id) {
        const { data: isUserBlocked, error: blockCheckError } = await supabase
          .rpc('check_if_user_is_blocked', { 
            blocker_uuid: user.id, 
            blocked_uuid: id 
          });
        
        if (blockCheckError) {
          console.error('Error checking block status:', blockCheckError);
        } else {
          setIsBlocked(!!isUserBlocked);
        }
      }

      // TODO: Fetch seller profile details once profiles table is implemented
      // For now using mock data
      setSeller({
        name: "John Doe",
        photoUrl: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7",
        location: "New York, NY",
        joinDate: "2024",
      });
    };

    fetchSellerDetails();
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TopBar title="Seller Profile" showBackButton />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card className="p-6">
          <SellerHeader seller={seller} ratings={ratings} />
          <SellerActions 
            sellerId={id || ""} 
            sellerName={seller.name}
            sellerAvatar={seller.photoUrl}
            isBlocked={isBlocked}
            setIsBlocked={setIsBlocked}
          />
        </Card>

        <SellerItems sellerName={seller.name} sellerId={id} />
      </main>
      <BottomNav />
    </div>
  );
};

export default SellerProfile;
