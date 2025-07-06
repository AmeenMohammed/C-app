
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Trash2, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface SavedItem {
  id: string;
  title: string;
  price: number;
  images: string[];
  description: string;
  savedAt: string;
}

const SavedItems = () => {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSavedItems = () => {
      try {
        const saved = localStorage.getItem('savedItems');
        if (saved) {
          setSavedItems(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Error loading saved items:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSavedItems();
  }, []);

  const removeFromSaved = (itemId: string) => {
    try {
      const updatedItems = savedItems.filter(item => item.id !== itemId);
      setSavedItems(updatedItems);
      localStorage.setItem('savedItems', JSON.stringify(updatedItems));
      toast.success('Item removed from saved items');
    } catch (error) {
      console.error('Error removing saved item:', error);
      toast.error('Failed to remove item');
    }
  };

  const clearAllSaved = () => {
    try {
      setSavedItems([]);
      localStorage.removeItem('savedItems');
      toast.success('All saved items cleared');
    } catch (error) {
      console.error('Error clearing saved items:', error);
      toast.error('Failed to clear saved items');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TopBar title="Saved Items" showBackButton={true} />
      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-8">Loading saved items...</div>
        ) : savedItems.length === 0 ? (
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-center h-32">
              <Heart className="h-12 w-12 text-gray-400" />
            </div>
            <p className="text-center text-gray-600">No saved items yet</p>
            <p className="text-center text-sm text-gray-500 mt-2">
              Save items you're interested in to view them here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                {savedItems.length} Saved Item{savedItems.length !== 1 ? 's' : ''}
              </h2>
              {savedItems.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearAllSaved}
                  className="text-red-600 hover:text-red-700"
                >
                  Clear All
                </Button>
              )}
            </div>
            
            {savedItems.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex gap-4">
                  {item.images?.[0] && (
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="w-24 h-24 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                    <div className="flex justify-between items-center mt-2">
                      <p className="font-semibold text-lg">${item.price}</p>
                      <div className="flex items-center gap-2">
                        <Link to={`/items/${item.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeFromSaved(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Saved on {new Date(item.savedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default SavedItems;
