
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";

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
  return (
    <div className="grid grid-cols-2 gap-4">
      {SAMPLE_ITEMS.map((item) => (
        <Link key={item.id} to={`/items/${item.id}`}>
          <Card className="overflow-hidden">
            <img
              src={item.image}
              alt={item.title}
              className="w-full aspect-square object-cover"
            />
            <div className="p-3">
              <h3 className="font-medium text-sm">{item.title}</h3>
              <p className="text-sm text-muted-foreground">${item.price}</p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
