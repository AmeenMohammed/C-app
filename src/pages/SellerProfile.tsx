
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ItemGrid } from "@/components/ItemGrid";
import { BottomNav } from "@/components/BottomNav";
import { MapPin, Star, StarHalf } from "lucide-react";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

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
  const [selectedRating, setSelectedRating] = useState(0);
  const [review, setReview] = useState("");

  useEffect(() => {
    const fetchSellerDetails = async () => {
      if (!id) return;

      // Fetch seller ratings
      const { data: ratingData, error: ratingError } = await supabase
        .rpc('get_seller_ratings', { seller_uuid: id });

      if (ratingError) {
        console.error('Error fetching ratings:', ratingError);
      } else {
        setRatings(ratingData[0]);
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

  const handleSubmitRating = async () => {
    if (!id || selectedRating === 0) return;

    const { error } = await supabase
      .from('item_ratings')
      .insert({
        seller_id: id,
        buyer_id: 'current-user-id', // TODO: Replace with actual user ID
        item_id: 'item-id', // TODO: Replace with actual item ID
        rating: selectedRating,
        review,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit rating. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Rating submitted successfully!",
      });
      setSelectedRating(0);
      setReview("");
    }
  };

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
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex">{ratings && renderStars(ratings.average_rating)}</div>
              <span className="font-medium">{ratings?.average_rating || 0}</span>
              <span className="text-muted-foreground">
                ({ratings?.total_ratings || 0} ratings)
              </span>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  Rate Seller
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Rate {seller.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Button
                        key={rating}
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedRating(rating)}
                      >
                        <Star
                          className={`h-6 w-6 ${
                            rating <= selectedRating
                              ? "fill-primary text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                      </Button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Write your review (optional)"
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                  />
                  <Button onClick={handleSubmitRating} className="w-full">
                    Submit Rating
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        <div>
          <h3 className="text-lg font-semibold mb-4">Seller's Items</h3>
          <ItemGrid />
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default SellerProfile;
