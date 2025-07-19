
import { useState } from "react";
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PostProps {
  username: string;
  userImage: string;
  image: string;
  caption: string;
  likes: number;
}

export function Post({ username, userImage, image, caption, likes }: PostProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(likes);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
  };

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden post-animation">
      <div className="flex items-center p-4">
        <img
          src={userImage}
          alt={username}
          className="w-8 h-8 rounded-full object-cover"
        />
        <span className="ml-3 font-medium">{username}</span>
      </div>

      <img src={image} alt="Post content" className="w-full aspect-square object-cover" />

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLike}
              className={cn("hover:text-rose-600", isLiked && "text-rose-600")}
            >
              <Heart className={cn("h-6 w-6", isLiked && "fill-current")} />
            </Button>
            <Button variant="ghost" size="icon">
              <MessageCircle className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon">
              <Share2 className="h-6 w-6" />
            </Button>
          </div>
          <Button variant="ghost" size="icon">
            <Bookmark className="h-6 w-6" />
          </Button>
        </div>

        <div className="font-medium mb-2">{likesCount.toLocaleString()} likes</div>
        <div>
          <span className="font-medium mr-2">{username}</span>
          {caption}
        </div>
      </div>
    </div>
  );
}
