
import { ItemGrid } from "@/components/ItemGrid";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";

const Home = () => {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TopBar title="Home" showBackButton={false} />
      <main className="container mx-auto px-4 py-6">
        <ItemGrid />
      </main>
      <BottomNav />
    </div>
  );
};

export default Home;
