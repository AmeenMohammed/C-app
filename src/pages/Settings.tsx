
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
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [openEditProfile, setOpenEditProfile] = useState(false);
  const [openChangePassword, setOpenChangePassword] = useState(false);
  const [openPrivacySettings, setOpenPrivacySettings] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [openLanguage, setOpenLanguage] = useState(false);
  const [openTheme, setOpenTheme] = useState(false);
  const [openBlockedUsers, setOpenBlockedUsers] = useState(false);

  // Form state
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: true,
    allowDirectMessages: true,
    showActivityStatus: true,
  });
  const [notifications, setNotifications] = useState({
    pushNotifications: true,
    emailNotifications: true,
    messageNotifications: true,
    dealAlerts: true,
  });
  const [language, setLanguage] = useState("english");

  // Blocked users state
  const [blockedUsers, setBlockedUsers] = useState<Array<{
    blocked_user_id: string;
    blocked_at: string;
    user_profile?: {
      full_name: string;
      avatar_url: string;
    };
  }>>([]);
  const [loadingBlockedUsers, setLoadingBlockedUsers] = useState(false);
  const [unblockingUsers, setUnblockingUsers] = useState<Set<string>>(new Set());

  const handleSaveProfile = () => {
    toast({
      description: "Profile updated successfully",
    });
    setOpenEditProfile(false);
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        description: "Passwords do not match",
      });
      return;
    }

    toast({
      description: "Password changed successfully",
    });
    setOpenChangePassword(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSavePrivacySettings = () => {
    toast({
      description: "Privacy settings updated",
    });
    setOpenPrivacySettings(false);
  };

  const handleSaveNotifications = () => {
    toast({
      description: "Notification preferences updated",
    });
    setOpenNotifications(false);
  };

  const handleSaveLanguage = () => {
    toast({
      description: `Language changed to ${language}`,
    });
    setOpenLanguage(false);
  };

  const handleSaveTheme = () => {
    toast({
      description: `Theme changed to ${theme} mode`,
    });
    setOpenTheme(false);
  };

  // Load blocked users when the dialog opens
  const loadBlockedUsers = async () => {
    if (!user) return;

    setLoadingBlockedUsers(true);
    try {
      const { data: blockedUserIds, error } = await supabase.rpc('get_blocked_users', {
        blocker_uuid: user.id
      });

      if (error) {
        console.error('Error fetching blocked users:', error);
        toast({
          variant: "destructive",
          description: "Failed to load blocked users",
        });
        return;
      }

      if (!blockedUserIds || blockedUserIds.length === 0) {
        setBlockedUsers([]);
        return;
      }

      // Get user profiles for blocked users
      const userIds = blockedUserIds.map(item => item.blocked_user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
      }

      // Combine blocked user data with profiles
      const blockedUsersWithProfiles = blockedUserIds.map(blockedUser => ({
        ...blockedUser,
        user_profile: profiles?.find(profile => profile.user_id === blockedUser.blocked_user_id) || {
          full_name: 'Unknown User',
          avatar_url: null
        }
      }));

      setBlockedUsers(blockedUsersWithProfiles);
    } catch (error) {
      console.error('Error loading blocked users:', error);
      toast({
        variant: "destructive",
        description: "Failed to load blocked users",
      });
    } finally {
      setLoadingBlockedUsers(false);
    }
  };

  const handleUnblockUser = async (userId: string, userName: string) => {
    if (!user) return;

    setUnblockingUsers(prev => new Set([...prev, userId]));

    try {
      const { error } = await supabase.rpc('unblock_user', {
        blocker_uuid: user.id,
        blocked_uuid: userId
      });

      if (error) {
        console.error('Error unblocking user:', error);
        toast({
          variant: "destructive",
          description: `Failed to unblock ${userName}`,
        });
      } else {
        setBlockedUsers(prev => prev.filter(user => user.blocked_user_id !== userId));
        toast({
          description: `You've unblocked ${userName}`,
        });
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast({
        variant: "destructive",
        description: `Failed to unblock ${userName}`,
      });
    } finally {
      setUnblockingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleOpenBlockedUsers = () => {
    setOpenBlockedUsers(true);
    loadBlockedUsers();
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
    <div className="min-h-screen bg-background">
      <TopBar title="Settings" showBackButton={true} />
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6 pb-16">
          <div className="rounded-lg bg-card p-6 shadow">
            <h2 className="text-lg font-medium">Account Settings</h2>
            <Separator className="my-4" />
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setOpenEditProfile(true)}
              >
                Edit Profile
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setOpenChangePassword(true)}
              >
                Change Password
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setOpenPrivacySettings(true)}
              >
                Privacy Settings
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleOpenBlockedUsers}
              >
                Blocked Users
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-card p-6 shadow">
            <h2 className="text-lg font-medium">Preferences</h2>
            <Separator className="my-4" />
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setOpenNotifications(true)}
              >
                Notifications
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setOpenLanguage(true)}
              >
                Language
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setOpenTheme(true)}
              >
                Theme
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-card p-6 shadow">
            <h2 className="text-lg font-medium text-destructive">Danger Zone</h2>
            <Separator className="my-4" />
            <div className="space-y-4">
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

      {/* Edit Profile Dialog */}
      <Dialog open={openEditProfile} onOpenChange={setOpenEditProfile}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Make changes to your profile here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bio" className="text-right">
                Bio
              </Label>
              <Input
                id="bio"
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveProfile}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={openChangePassword} onOpenChange={setOpenChangePassword}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="current-password" className="text-right">
                Current
              </Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-password" className="text-right">
                New
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="confirm-password" className="text-right">
                Confirm
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleChangePassword}>Update Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Privacy Settings Dialog */}
      <Dialog open={openPrivacySettings} onOpenChange={setOpenPrivacySettings}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Privacy Settings</DialogTitle>
            <DialogDescription>
              Manage your privacy preferences.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="profile-visibility" className="flex-1">
                Profile Visibility
              </Label>
              <Switch
                id="profile-visibility"
                checked={privacySettings.profileVisibility}
                onCheckedChange={(checked) =>
                  setPrivacySettings({...privacySettings, profileVisibility: checked})
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="direct-messages" className="flex-1">
                Allow Direct Messages
              </Label>
              <Switch
                id="direct-messages"
                checked={privacySettings.allowDirectMessages}
                onCheckedChange={(checked) =>
                  setPrivacySettings({...privacySettings, allowDirectMessages: checked})
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="activity-status" className="flex-1">
                Show Activity Status
              </Label>
              <Switch
                id="activity-status"
                checked={privacySettings.showActivityStatus}
                onCheckedChange={(checked) =>
                  setPrivacySettings({...privacySettings, showActivityStatus: checked})
                }
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSavePrivacySettings}>Save Preferences</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog open={openNotifications} onOpenChange={setOpenNotifications}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Notification Settings</DialogTitle>
            <DialogDescription>
              Customize how you want to be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="push-notifications" className="flex-1">
                Push Notifications
              </Label>
              <Switch
                id="push-notifications"
                checked={notifications.pushNotifications}
                onCheckedChange={(checked) =>
                  setNotifications({...notifications, pushNotifications: checked})
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notifications" className="flex-1">
                Email Notifications
              </Label>
              <Switch
                id="email-notifications"
                checked={notifications.emailNotifications}
                onCheckedChange={(checked) =>
                  setNotifications({...notifications, emailNotifications: checked})
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="message-notifications" className="flex-1">
                New Message Alerts
              </Label>
              <Switch
                id="message-notifications"
                checked={notifications.messageNotifications}
                onCheckedChange={(checked) =>
                  setNotifications({...notifications, messageNotifications: checked})
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="deal-alerts" className="flex-1">
                Deal Alerts
              </Label>
              <Switch
                id="deal-alerts"
                checked={notifications.dealAlerts}
                onCheckedChange={(checked) =>
                  setNotifications({...notifications, dealAlerts: checked})
                }
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveNotifications}>Save Preferences</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Language Dialog */}
      <Dialog open={openLanguage} onOpenChange={setOpenLanguage}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Language Settings</DialogTitle>
            <DialogDescription>
              Select your preferred language.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="spanish">Spanish</SelectItem>
                <SelectItem value="french">French</SelectItem>
                <SelectItem value="german">German</SelectItem>
                <SelectItem value="japanese">Japanese</SelectItem>
                <SelectItem value="chinese">Chinese</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveLanguage}>Save Preference</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Theme Dialog */}
      <Dialog open={openTheme} onOpenChange={setOpenTheme}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Theme Settings</DialogTitle>
            <DialogDescription>
              Choose your preferred theme.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Tabs value={theme} className="w-full" onValueChange={setTheme}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="light">Light</TabsTrigger>
                <TabsTrigger value="dark">Dark</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
              </TabsList>
              <TabsContent value="light" className="mt-4">
                <div className="rounded-md border border-gray-200 p-4 bg-white">
                  <div className="h-16 rounded bg-gray-100 mb-2"></div>
                  <div className="h-4 w-3/4 rounded bg-gray-200 mb-2"></div>
                  <div className="h-4 w-1/2 rounded bg-gray-200"></div>
                </div>
              </TabsContent>
              <TabsContent value="dark" className="mt-4">
                <div className="rounded-md border border-gray-700 p-4 bg-gray-900 text-white">
                  <div className="h-16 rounded bg-gray-700 mb-2"></div>
                  <div className="h-4 w-3/4 rounded bg-gray-600 mb-2"></div>
                  <div className="h-4 w-1/2 rounded bg-gray-600"></div>
                </div>
              </TabsContent>
              <TabsContent value="system" className="mt-4">
                <div className="rounded-md border p-4 bg-gradient-to-r from-white to-gray-900 text-gray-800">
                  <div className="h-16 rounded bg-gradient-to-r from-gray-100 to-gray-700 mb-2"></div>
                  <div className="h-4 w-3/4 rounded bg-gradient-to-r from-gray-200 to-gray-600 mb-2"></div>
                  <div className="h-4 w-1/2 rounded bg-gradient-to-r from-gray-200 to-gray-600"></div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveTheme}>Save Preference</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blocked Users Dialog */}
      <Dialog open={openBlockedUsers} onOpenChange={setOpenBlockedUsers}>
        <DialogContent className="sm:max-w-[500px] max-h-[600px] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Blocked Users</DialogTitle>
            <DialogDescription>
              Manage users you have blocked. You can unblock users to allow interactions again.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-[400px] overflow-y-auto">
            {loadingBlockedUsers ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : blockedUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>You haven't blocked any users yet.</p>
                <p className="text-sm mt-2">Blocked users will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {blockedUsers.map((blockedUser) => (
                  <div key={blockedUser.blocked_user_id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={blockedUser.user_profile?.avatar_url || `https://api.dicebear.com/7.x/avatars/svg?seed=${blockedUser.user_profile?.full_name || 'user'}`}
                        />
                        <AvatarFallback>
                          {blockedUser.user_profile?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {blockedUser.user_profile?.full_name || 'Unknown User'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Blocked {new Date(blockedUser.blocked_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnblockUser(
                        blockedUser.blocked_user_id,
                        blockedUser.user_profile?.full_name || 'this user'
                      )}
                      disabled={unblockingUsers.has(blockedUser.blocked_user_id)}
                    >
                      {unblockingUsers.has(blockedUser.blocked_user_id) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                          Unblocking...
                        </>
                      ) : (
                        'Unblock'
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
