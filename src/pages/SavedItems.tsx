
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Trash2, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/utils/currency";

interface SavedItem {
  id: string;
  title: string;
  price: number;
  currency?: string;
  images: string[];
  description: string;
  savedAt: string;
}

const SavedItems = () => {
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSavedItems = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('saved_items')
          .select(`
            id,
            created_at,
            items (
              id,
              title,
              price,
              images,
              description
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedItems = data?.map(savedItem => ({
          id: savedItem.items?.id || '',
          title: savedItem.items?.title || '',
          price: savedItem.items?.price || 0,
          images: savedItem.items?.images || [],
          description: savedItem.items?.description || '',
          savedAt: savedItem.created_at
        })) || [];

        setSavedItems(formattedItems);
      } catch (error) {
        console.error('Error loading saved items:', error);
        toast.error(t('failedToLoadProfile'));
      } finally {
        setLoading(false);
      }
    };

    loadSavedItems();
  }, [user]);

  const removeFromSaved = async (itemId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('saved_items')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', itemId);

      if (error) throw error;

      const updatedItems = savedItems.filter(item => item.id !== itemId);
      setSavedItems(updatedItems);
    } catch (error) {
      console.error('Error removing saved item:', error);
      toast.error(t('errorSavingItem'));
    }
  };

  const clearAllSaved = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('saved_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setSavedItems([]);
    } catch (error) {
      console.error('Error clearing saved items:', error);
      toast.error(t('error'));
    }
  };

  return (
    <div className={`min-h-screen bg-background pb-16 ${isRTL ? 'rtl' : 'ltr'}`}>
      <TopBar title={t('savedItems')} showBackButton={true} />
      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-8">{t('loading')}...</div>
        ) : savedItems.length === 0 ? (
          <div className="rounded-lg bg-card p-6 shadow">
            <div className="flex items-center justify-center h-32">
              <Heart className="h-12 w-12 text-gray-400" />
            </div>
            <p className="text-center text-gray-600">{t('noItemsPostedYet')}</p>
            <p className="text-center text-sm text-gray-500 mt-2">
              Save items you're interested in to view them here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h2 className={`text-lg font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>
                {savedItems.length} {t('savedItems')}
              </h2>
              {savedItems.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllSaved}
                  className="text-red-600 hover:text-red-700"
                >
{t('clear')} All
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
                      <p className="font-semibold text-lg">{formatPrice(item.price, item.currency)}</p>
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
