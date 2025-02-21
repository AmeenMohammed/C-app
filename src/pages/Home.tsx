
import { Button } from "@/components/ui/button";
import { ItemGrid } from "@/components/ItemGrid";
import { TopBar } from "@/components/TopBar";

const Home = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar title="Home" showBackButton={false} />
      <main className="container mx-auto px-4 py-6">
        <ItemGrid />
      </main>
    </div>
  );
};

export default Home;
