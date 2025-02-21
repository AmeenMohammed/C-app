
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const Settings = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar title="Settings" showBackButton={true} />
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium">Account Settings</h2>
            <Separator className="my-4" />
            <div className="space-y-4">
              <Button variant="outline" className="w-full justify-start">
                Edit Profile
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Change Password
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Privacy Settings
              </Button>
            </div>
          </div>
          
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium">Preferences</h2>
            <Separator className="my-4" />
            <div className="space-y-4">
              <Button variant="outline" className="w-full justify-start">
                Notifications
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Language
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Theme
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
