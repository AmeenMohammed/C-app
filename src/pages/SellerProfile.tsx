import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { SellerHeader } from "@/components/seller/SellerHeader";
import { SellerActions } from "@/components/seller/SellerActions";
import { SellerItems } from "@/components/seller/SellerItems";
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";


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
  const { id: sellerId } = useParams(); // Fixed: route parameter is :id, not :sellerId
  const { user } = useAuth();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [ratings, setRatings] = useState<SellerRatings | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Rating state
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [userHasRated, setUserHasRated] = useState(false);
  const [userRating, setUserRating] = useState<{rating: number} | null>(null);

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

        // Try to fetch the profile for the specific seller ID provided
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', sellerId)
          .maybeSingle(); // Use maybeSingle() instead of single() to avoid PGRST116

        if (profileError) {
          console.error('Error fetching seller profile:', profileError);
          setSeller(null);
        } else if (!profileData) {
          // No profile found for this seller ID, create a fallback profile
          console.log('No profile found for seller ID:', sellerId, 'Creating fallback profile');

          // Create a simple fallback seller profile
          setSeller({
            id: sellerId,
            user_id: sellerId,
            full_name: 'User',
            avatar_url: null,
            location: 'Location not set',
            created_at: new Date().toISOString()
          });
        } else {
          console.log('✅ Seller profile found:', profileData);
          setSeller(profileData);
        }

        // Fetch seller ratings for the specific seller
        try {
          const { data: ratingsData } = await supabase.rpc('get_seller_ratings', {
            seller_uuid: sellerId
          });

          if (ratingsData && ratingsData.length > 0) {
            setRatings(ratingsData[0]);
          }
        } catch (ratingsError) {
          console.warn('Failed to fetch seller ratings:', ratingsError);
        }

        // Check if current user has blocked this seller
        if (user && sellerId !== user.id) {
          try {
            const { data: blockedData } = await supabase.rpc('check_if_user_is_blocked', {
              blocker_uuid: user.id,
              blocked_uuid: sellerId
            });
            setIsBlocked(blockedData || false);
          } catch (blockingError) {
            console.warn('Blocking check failed for seller profile, setting to false:', blockingError.message);
            setIsBlocked(false);
          }

          // Check if user has already rated this seller
          try {
            const { data: existingRating } = await supabase
              .from('user_ratings')
              .select('rating')
              .eq('rater_id', user.id)
              .eq('rated_user_id', sellerId)
              .maybeSingle();

            if (existingRating) {
              setUserHasRated(true);
              setUserRating(existingRating);
              setSelectedRating(existingRating.rating);
            }
          } catch (ratingError) {
            console.warn('Failed to check existing rating:', ratingError);
          }
        }

      } catch (error) {
        console.error('Error fetching seller details:', error);
        setSeller(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSellerDetails();
  }, [sellerId, user, navigate]);

  const handleRatingSubmit = async () => {
    if (!user || !sellerId || selectedRating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmittingRating(true);
    try {
      if (userHasRated) {
        // Update existing rating
        const { error } = await supabase
          .from('user_ratings')
          .update({
            rating: selectedRating
          })
          .eq('rater_id', user.id)
          .eq('rated_user_id', sellerId);

        if (error) throw error;
        toast.success("Rating updated successfully!");
      } else {
        // Insert new rating
        const { error } = await supabase
          .from('user_ratings')
          .insert({
            rater_id: user.id,
            rated_user_id: sellerId,
            rating: selectedRating
          });

        if (error) throw error;
        setUserHasRated(true);
        toast.success("Rating submitted successfully!");
      }

      setUserRating({ rating: selectedRating });

      // Refresh seller ratings
      try {
        const { data: ratingsData } = await supabase.rpc('get_seller_ratings', {
          seller_uuid: sellerId
        });

        if (ratingsData && ratingsData.length > 0) {
          setRatings(ratingsData[0]);
        }
      } catch (ratingsError) {
        console.warn('Failed to refresh seller ratings:', ratingsError);
      }

      setShowRatingDialog(false);
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error("Failed to submit rating. Please try again.");
    } finally {
      setSubmittingRating(false);
    }
  };

  const resetRatingDialog = () => {
    if (!userHasRated) {
      setSelectedRating(0);
    } else {
      setSelectedRating(userRating?.rating || 0);
    }
    setHoverRating(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-16">
        <TopBar title="Seller Profile" showBackButton={true} />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
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
    photoUrl: seller.avatar_url || 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7',
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

        {/* Rating Section - only show if not the user's own profile and not blocked */}
        {user && sellerId !== user.id && !isBlocked && (
          <div className="bg-white rounded-lg p-6 shadow">
            <h3 className="text-lg font-medium mb-4">Rate this seller</h3>
            <Dialog open={showRatingDialog} onOpenChange={(open) => {
              setShowRatingDialog(open);
              if (open) resetRatingDialog();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  {userHasRated ? "Update Rating" : "Rate Seller"}
                  <Star className="ml-2 h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>
                    {userHasRated ? "Update Your Rating" : "Rate This Seller"}
                  </DialogTitle>
                  <DialogDescription>
                    Share your experience with {sellerData.name}
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                  {/* Star Rating */}
                  <div className="text-center">
                    <label className="block text-sm font-medium mb-4">Rate this seller</label>
                    <div className="flex justify-center gap-2 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setSelectedRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 transition-colors hover:scale-110"
                        >
                          <Star
                            className={`h-10 w-10 ${
                              star <= (hoverRating || selectedRating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300 hover:text-gray-400'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    {selectedRating > 0 && (
                      <p className="text-lg font-medium text-gray-700">
                        {selectedRating === 1 && "Poor"}
                        {selectedRating === 2 && "Fair"}
                        {selectedRating === 3 && "Good"}
                        {selectedRating === 4 && "Very Good"}
                        {selectedRating === 5 && "Excellent"}
                      </p>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button
                    onClick={handleRatingSubmit}
                    disabled={selectedRating === 0 || submittingRating}
                  >
                    {submittingRating ? "Submitting..." : userHasRated ? "Update Rating" : "Submit Rating"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Show current user's rating if they have rated */}
            {userHasRated && userRating && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Your rating:</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= userRating.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">({userRating.rating}/5)</span>
                </div>
              </div>
            )}
          </div>
        )}

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
