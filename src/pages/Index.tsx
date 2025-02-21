
import { StoriesBar } from "@/components/StoriesBar";
import { Feed } from "@/components/Feed";

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-4 space-y-6">
      <StoriesBar />
      <Feed />
    </div>
  );
};

export default Index;
