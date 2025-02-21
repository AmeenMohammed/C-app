
import { cn } from "@/lib/utils";

interface StoryCircleProps {
  imageUrl: string;
  username: string;
  viewed?: boolean;
}

export function StoryCircle({ imageUrl, username, viewed = false }: StoryCircleProps) {
  return (
    <div className="flex flex-col items-center space-y-1">
      <div className={cn(viewed ? "story-ring-viewed" : "story-ring")}>
        <div className="block rounded-full p-[2px] bg-white">
          <img
            src={imageUrl}
            alt={username}
            className="w-16 h-16 rounded-full object-cover"
          />
        </div>
      </div>
      <span className="text-xs font-medium truncate w-20 text-center">
        {username}
      </span>
    </div>
  );
}
