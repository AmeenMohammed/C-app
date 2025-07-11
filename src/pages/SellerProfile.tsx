import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { SellerHeader } from "@/components/seller/SellerHeader";
import { SellerActions } from "@/components/seller/SellerActions";
import { SellerItems } from "@/components/seller/SellerItems";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Button } from "@/components/ui/button";

interface SellerRatings {
  average_rating: number;
  total_ratings: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
}

interface SellerProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  location: string;
  user_id: string;
  created_at: string;
}

const SellerProfile = () => {
  const { sellerId } = useParams();
  const { user } = useAuth();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [ratings, setRatings] = useState<SellerRatings | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSellerDetails = async () => {
      try {
        setLoading(true);

        // If no sellerId is provided in the URL, this should not happen for seller profiles
        if (!sellerId) {
          console.error('No seller ID provided in URL');
          navigate('/home');
          return;
        }

        // Always fetch the profile for the specific seller ID provided
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', sellerId)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          // No profile found for this seller ID
          console.error('No profile found for seller ID:', sellerId);
          setSeller(null);
        } else if (!profileError && profileData) {
          setSeller(profileData);
        }

        // Fetch seller ratings for the specific seller
        const { data: ratingsData } = await supabase.rpc('get_seller_ratings', {
          seller_uuid: sellerId
        });

        if (ratingsData && ratingsData.length > 0) {
          setRatings(ratingsData[0]);
        }

        // Check if current user has blocked this seller
        if (user && sellerId !== user.id) {
          const { data: blockedData } = await supabase.rpc('check_if_user_is_blocked', {
            blocker_uuid: user.id,
            blocked_uuid: sellerId
          });
          setIsBlocked(blockedData || false);
        }

      } catch (error) {
        console.error('Error fetching seller details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSellerDetails();
  }, [sellerId, user]);

  if (loading) {
    return <LoadingScreen message="Loading profile..." />;
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-gray-50 pb-16">
        <TopBar title="Seller Profile" />
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <p className="text-muted-foreground">Seller profile not found</p>
            <Button onClick={() => navigate('/home')} className="mt-4">
              Back to Home
            </Button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const sellerData = {
    name: seller.full_name || 'Unknown User',
    photoUrl: seller.avatar_url || '/placeholder.svg',
    location: seller.location || 'Location not set',
    joinDate: new Date(seller.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    })
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TopBar title={sellerData.name} />

      <main className="container mx-auto px-4 py-6 space-y-6">
        <SellerHeader seller={sellerData} ratings={ratings} />

        <SellerActions
          sellerId={seller.user_id}
          sellerName={sellerData.name}
          sellerAvatar={sellerData.photoUrl}
          isBlocked={isBlocked}
          setIsBlocked={setIsBlocked}
        />

        <SellerItems
          sellerName={sellerData.name}
          sellerId={seller.user_id}
        />
      </main>

      <BottomNav />
    </div>
  );
};

export default SellerProfile;
