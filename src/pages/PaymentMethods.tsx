
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus } from "lucide-react";

const PaymentMethods = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar title="Payment Methods" showBackButton={true} />
      <main className="container mx-auto px-4 py-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium">Your Payment Methods</h2>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
          </div>
          <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg">
            <div className="text-center">
              <CreditCard className="h-12 w-12 mx-auto text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">No payment methods added yet</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PaymentMethods;
