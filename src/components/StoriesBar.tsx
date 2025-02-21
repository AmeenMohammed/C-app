
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { StoryCircle } from "./StoryCircle";

const SAMPLE_STORIES = [
  { id: 1, username: "johndoe", imageUrl: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7" },
  { id: 2, username: "janedoe", imageUrl: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d" },
  { id: 3, username: "mike_smith", imageUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158" },
  { id: 4, username: "sarah.js", imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c" },
  { id: 5, username: "alex_dev", imageUrl: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7" },
  { id: 6, username: "emma.tech", imageUrl: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d" },
];

export function StoriesBar() {
  return (
    <div className="feed-width">
      <ScrollArea className="w-full whitespace-nowrap rounded-md border bg-white/50 backdrop-blur-sm">
        <div className="flex w-max space-x-4 p-4">
          {SAMPLE_STORIES.map((story) => (
            <StoryCircle
              key={story.id}
              username={story.username}
              imageUrl={story.imageUrl}
              viewed={story.id > 3}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
