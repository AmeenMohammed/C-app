
import { TopBar } from "@/components/TopBar";
import { Heart } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

const SavedItems = () => {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TopBar title="Saved Items" showBackButton={true} />
      <main className="container mx-auto px-4 py-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-center h-32">
            <Heart className="h-12 w-12 text-gray-400" />
          </div>
          <p className="text-center text-gray-600">No saved items yet</p>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default SavedItems;
