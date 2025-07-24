
import { ItemGrid } from "@/components/ItemGrid";

interface SellerItemsProps {
  sellerName: string;
  sellerId?: string;
}

export const SellerItems = ({ sellerName, sellerId }: SellerItemsProps) => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">{sellerName}'s Items</h3>
      <ItemGrid userId={sellerId} isProfile={true} />
    </div>
  );
};
