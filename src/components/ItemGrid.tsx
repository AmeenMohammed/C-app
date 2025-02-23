
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
    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 gap-1">
      {SAMPLE_ITEMS.map((item) => (
        <Link key={item.id} to={`/items/${item.id}`}>
          <Card className="overflow-hidden relative group">
            <div className="absolute top-0.5 right-0.5 flex gap-0.5 z-10">
              <Button
                variant="secondary"
                size="icon"
                className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleSave(e, item.id)}
              >
                <BookmarkPlus className="h-2 w-2" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleContact(e, item.id)}
              >
                <MessageSquare className="h-2 w-2" />
              </Button>
            </div>
            <div className="relative pb-[100%]">
              <img
                src={item.image}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="p-0.5">
              <h3 className="font-medium text-[10px] leading-tight truncate">{item.title}</h3>
              <p className="text-[10px] leading-tight text-muted-foreground">${item.price}</p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
