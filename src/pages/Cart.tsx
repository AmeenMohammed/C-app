
import { TopBar } from "@/components/TopBar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CartItem {
  id: string;
  item: {
    id: string;
    title: string;
    price: number;
    images: string[];
    description: string;
  };
  quantity: number;
}

export default function Cart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCartItems = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          quantity,
          item:items (
            id,
            title,
            price,
            images,
            description
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setCartItems(data || []);
    } catch (error) {
      console.error('Error fetching cart items:', error);
      toast.error('Failed to load cart items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCartItems();
  }, []);

  const removeFromCart = async (cartItemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

      if (error) throw error;
      
      setCartItems(cartItems.filter(item => item.id !== cartItemId));
      toast.success('Item removed from cart');
    } catch (error) {
      console.error('Error removing item from cart:', error);
      toast.error('Failed to remove item from cart');
    }
  };

  const updateQuantity = async (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', cartItemId);

      if (error) throw error;
      
      setCartItems(cartItems.map(item => 
        item.id === cartItemId ? { ...item, quantity: newQuantity } : item
      ));
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity');
    }
  };

  const totalPrice = cartItems.reduce((sum, item) => sum + (item.item.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar title="My Cart" />
      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-8">Loading cart...</div>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Your cart is empty</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cartItems.map((cartItem) => (
              <Card key={cartItem.id} className="p-4">
                <div className="flex gap-4">
                  {cartItem.item.images?.[0] && (
                    <img
                      src={cartItem.item.images[0]}
                      alt={cartItem.item.title}
                      className="w-24 h-24 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{cartItem.item.title}</h3>
                    <p className="text-sm text-gray-500">{cartItem.item.description}</p>
                    <div className="flex justify-between items-center mt-2">
                      <p className="font-semibold">${cartItem.item.price}</p>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateQuantity(cartItem.id, cartItem.quantity - 1)}
                        >
                          -
                        </Button>
                        <span>{cartItem.quantity}</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateQuantity(cartItem.id, cartItem.quantity + 1)}
                        >
                          +
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeFromCart(cartItem.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            <Card className="p-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total:</span>
                <span className="font-semibold">${totalPrice.toFixed(2)}</span>
              </div>
              <Button className="w-full mt-4">
                Proceed to Checkout
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
