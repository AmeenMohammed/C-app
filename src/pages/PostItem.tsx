
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, TrendingUp } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "@/components/ui/use-toast";

const PostItem = () => {
  const handlePromoteItem = () => {
    toast({
      title: "Promotion Started",
      description: "Your item will be moved to the top after payment confirmation.",
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
      <BottomNav />
    </div>
  );
};

export default PostItem;
