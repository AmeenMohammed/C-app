
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { BookmarkPlus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const SAMPLE_ITEMS = [
  {
    id: 1,
    title: "Vintage Camera",
    price: 299,
    image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d",
  },
  {
    id: 2,
    title: "Laptop Stand",
    price: 49,
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c",
  },
];

export function ItemGrid() {
  const { toast } = useToast();

  const handleSave = (e: React.MouseEvent, itemId: number) => {
    e.preventDefault(); // Prevent navigation
    toast({
      description: "Item saved for later",
    });
  };

  const handleContact = (e: React.MouseEvent, itemId: number) => {
    e.preventDefault(); // Prevent navigation
    toast({
      description: "Opening chat with seller...",
    });
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      {SAMPLE_ITEMS.map((item) => (
        <Link key={item.id} to={`/items/${item.id}`}>
          <Card className="overflow-hidden relative group">
            <div className="absolute top-1 right-1 flex gap-1 z-10">
              <Button
                variant="secondary"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleSave(e, item.id)}
              >
                <BookmarkPlus className="h-3 w-3" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleContact(e, item.id)}
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
            </div>
            <div className="relative pb-[100%]">
              <img
                src={item.image}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="p-1">
              <h3 className="font-medium text-xs truncate">{item.title}</h3>
              <p className="text-xs text-muted-foreground">${item.price}</p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
