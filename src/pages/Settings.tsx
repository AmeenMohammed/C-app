
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          variant: "destructive",
          description: "Error logging out. Please try again.",
        });
        return;
      }
      navigate("/");
      toast({
        description: "Successfully logged out",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description: "An unexpected error occurred",
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const { error } = await supabase.rpc('delete_user');
      if (error) {
        toast({
          variant: "destructive",
          description: "Error deleting account. Please try again.",
        });
        return;
      }
      await supabase.auth.signOut();
      navigate("/");
      toast({
        description: "Your account has been deleted",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description: "An unexpected error occurred",
      });
    }
  };

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

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium text-destructive">Danger Zone</h2>
            <Separator className="my-4" />
            <div className="space-y-4">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={handleLogout}
              >
                Logout
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    className="w-full justify-start"
                  >
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your
                      account and remove all your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;

