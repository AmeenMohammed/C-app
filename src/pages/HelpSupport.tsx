
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { HelpCircle, Mail, MessageCircle, Phone } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

const HelpSupport = () => {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TopBar title="Help & Support" showBackButton={true} />
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium mb-4">How can we help you?</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Button variant="outline" className="h-24 flex-col">
                <MessageCircle className="h-6 w-6 mb-2" />
                Live Chat
              </Button>
              <Button variant="outline" className="h-24 flex-col">
                <Mail className="h-6 w-6 mb-2" />
                Email Support
              </Button>
              <Button variant="outline" className="h-24 flex-col">
                <Phone className="h-6 w-6 mb-2" />
                Phone Support
              </Button>
              <Button variant="outline" className="h-24 flex-col">
                <HelpCircle className="h-6 w-6 mb-2" />
                FAQs
              </Button>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default HelpSupport;
