
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

const PostItem = () => {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TopBar title="Post New Item" />
      <main className="container mx-auto px-4 py-6">
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

            <Button className="w-full">Post Item</Button>
          </form>
        </Card>
      </main>
      <BottomNav />
    </div>
  );
};

export default PostItem;
