
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Post } from "./Post";

const SAMPLE_POSTS = [
  {
    id: 1,
    username: "johndoe",
    userImage: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7",
    image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d",
    caption: "Working on some new features! #coding #webdev",
    likes: 1234,
  },
  {
    id: 2,
    username: "janedoe",
    userImage: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c",
    caption: "Team meeting day! Love collaborating with these awesome people",
    likes: 892,
  },
];

export function Feed() {
  const { t } = useLanguage();
  const [posts, setPosts] = useState(SAMPLE_POSTS);
  const [loading, setLoading] = useState(false);

  const loadMorePosts = () => {
    if (loading) return;
    setLoading(true);

    // Simulate loading more posts
    setTimeout(() => {
      setPosts([...posts, ...SAMPLE_POSTS.map(post => ({...post, id: post.id + posts.length}))]);
      setLoading(false);
    }, 1000);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1000) {
        loadMorePosts();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [posts]);

  return (
    <div className="feed-width space-y-6">
      {posts.map((post) => (
        <Post key={post.id} {...post} />
      ))}
      {loading && (
        <div className="text-center py-4 text-muted-foreground">
          {t('loadingMorePosts')}
        </div>
      )}
    </div>
  );
}
