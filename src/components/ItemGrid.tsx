
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface Item {
  id: string;
  title: string;
  price: number;
  images: string[];
  description: string;
  created_at: string;
  user_id: string;
  seller?: {
    id: string;
    avatar_url?: string;
    full_name?: string;
  };
}

export function ItemGrid() {
  const [items, setItems] = useState<Item[]>([
    {
      id: "1",
      title: "Leather Sofa",
      price: 599,
      images: ["/lovable-uploads/7edf0965-8425-4b93-8de6-785450ba27ae.png"],
      description: "Comfortable genuine leather sofa in excellent condition",
      created_at: "2023-05-12T10:30:00Z",
      user_id: "seller1",
      seller: {
        id: "seller1",
        avatar_url: "/lovable-uploads/e6019a3b-61c9-4472-b3d8-808cef7cf0f2.png",
        full_name: "Sarah Johnson",
      },
    },
    {
      id: "2",
      title: "iPhone 14 Pro",
      price: 899,
      images: ["/lovable-uploads/c8617c56-ede7-48cb-bc22-a12dda207d7e.png"],
      description: "Like new iPhone 14 Pro 256GB, Space Black",
      created_at: "2023-05-15T14:22:00Z",
      user_id: "seller2",
      seller: {
        id: "seller2",
        avatar_url: "/lovable-uploads/3377430e-f8c5-449c-a4cc-b797f7e85b18.png",
        full_name: "Mike Chen",
      },
    },
    {
      id: "3",
      title: "Mountain Bike",
      price: 450,
      images: ["/lovable-uploads/6c6ec4d4-1993-41ce-9a5c-8ac84ca16177.png"],
      description: "Trek mountain bike, 21 speed, barely used",
      created_at: "2023-05-18T09:15:00Z",
      user_id: "seller3",
      seller: {
        id: "seller3",
        avatar_url: "/lovable-uploads/e6019a3b-61c9-4472-b3d8-808cef7cf0f2.png",
        full_name: "Alex Smith",
      },
    },
  ]);

  const handleShare = async (item: Item) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: `Check out this ${item.title} for $${item.price}`,
          url: `${window.location.origin}/items/${item.id}`,
        });
        toast.success("Shared successfully!");
      } else {
        // Fallback for browsers that don't support the Web Share API
        navigator.clipboard.writeText(`${window.location.origin}/items/${item.id}`);
        toast.success("Link copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
      toast.error("Failed to share item");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <Card key={item.id} className="overflow-hidden">
          <Link to={`/items/${item.id}`} className="block">
            {item.images?.[0] && (
              <img
                src={item.images[0]}
                alt={item.title}
                className="w-full h-48 object-cover"
              />
            )}
          </Link>
          <div className="p-4">
            <div className="flex justify-between items-start">
              <Link to={`/items/${item.id}`} className="block">
                <h3 className="font-medium text-lg">{item.title}</h3>
                <p className="text-green-600 font-bold">${item.price}</p>
              </Link>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => handleShare(item)}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-gray-500 text-sm line-clamp-2 mt-1">
              {item.description}
            </p>
            {item.seller && (
              <Link to={`/seller/${item.seller.id}`} className="flex items-center mt-3">
                <div className="story-ring-viewed w-6 h-6">
                  {item.seller.avatar_url && (
                    <img
                      src={item.seller.avatar_url}
                      alt={item.seller.full_name || "Seller"}
                      className="rounded-full w-full h-full object-cover"
                    />
                  )}
                </div>
                <span className="text-xs text-gray-500 ml-2">
                  {item.seller.full_name || "Anonymous Seller"}
                </span>
              </Link>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
