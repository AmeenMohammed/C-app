
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, TrendingUp, MapPin } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "@/components/ui/use-toast";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PostItem = () => {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const handlePromoteItem = () => {
    setShowPaymentDialog(true);
  };

  const handlePayment = (method: string) => {
    setShowPaymentDialog(false);
    toast({
      title: "Processing Payment",
      description: `Processing payment via ${method}...`,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TopBar title="Post New Item" />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card className="p-6">
          <form className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Photos</label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Button variant="outline" className="mx-auto">
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Add Photos
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input placeholder="What are you selling?" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Price</label>
              <Input type="number" placeholder="0.00" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Location Range</label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cairo">Cairo</SelectItem>
                      <SelectItem value="giza">Giza</SelectItem>
                      <SelectItem value="alexandria">Alexandria</SelectItem>
                      <SelectItem value="sharm">Sharm El Sheikh</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Range (km)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 km</SelectItem>
                      <SelectItem value="10">10 km</SelectItem>
                      <SelectItem value="20">20 km</SelectItem>
                      <SelectItem value="50">50 km</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea 
                placeholder="Describe your item..." 
                className="min-h-[100px]"
              />
            </div>

            <Card 
              className="w-full flex items-center gap-4 p-4 hover:bg-accent transition-colors cursor-pointer bg-gradient-to-r from-primary/5 to-primary/10"
              onClick={handlePromoteItem}
            >
              <TrendingUp className="h-8 w-8 text-primary" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">Move to Top</h3>
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">10 EGP</span>
                </div>
                <p className="text-xs text-muted-foreground">Promote your items for more visibility</p>
              </div>
            </Card>

            <Button className="w-full">Post Item</Button>
          </form>
        </Card>
      </main>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Payment Method</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            {[
              { name: "Fawry", icon: "💳" },
              { name: "Visa", icon: "💳" },
              { name: "Instapay", icon: "🏦" },
              { name: "App Wallet", icon: "👝" },
            ].map((method) => (
              <Button
                key={method.name}
                variant="outline"
                className="w-full justify-start text-left"
                onClick={() => handlePayment(method.name)}
              >
                <span className="mr-2">{method.icon}</span>
                {method.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default PostItem;
