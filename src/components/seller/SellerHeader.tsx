
import { MapPin, Star, StarHalf } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";

interface SellerRatings {
  average_rating: number;
  total_ratings: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
}

interface SellerHeaderProps {
  seller: {
    name: string;
    photoUrl: string;
    location: string;
    joinDate: string;
  };
  ratings: SellerRatings | null;
}

export const SellerHeader = ({ seller, ratings }: SellerHeaderProps) => {
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
    </Card>
  );
};
