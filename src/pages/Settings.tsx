
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
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotificationSettings } from "@/contexts/NotificationContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { t, currentLanguage, setLanguage, supportedLanguages } = useLanguage();
  const { settings: notificationSettings, updateSettings: updateNotificationSettings } = useNotificationSettings();
  const [openChangePassword, setOpenChangePassword] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [openLanguage, setOpenLanguage] = useState(false);
  const [openTheme, setOpenTheme] = useState(false);
  const [openBlockedUsers, setOpenBlockedUsers] = useState(false);

  // Form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);

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



  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        description: t('passwordsDoNotMatch'),
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        description: t('passwordTooShort'),
      });
      return;
    }

    setLoadingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      setOpenChangePassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        variant: "destructive",
        description: (error as Error)?.message || t('errorChangingPassword'),
      });
    } finally {
      setLoadingPassword(false);
    }
  };



  const handleSaveNotifications = () => {
    setOpenNotifications(false);
  };

  const handleSaveLanguage = () => {
    setOpenLanguage(false);
  };

  const handleSaveTheme = () => {
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
          description: t('failedToLoadBlockedUsers'),
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
          description: t('failedToLoadBlockedUsers'),
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
          description: `${t('failedToUnblock')} ${userName}`,
        });
      } else {
        setBlockedUsers(prev => prev.filter(user => user.blocked_user_id !== userId));
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast({
        variant: "destructive",
        description: `${t('failedToUnblock')} ${userName}`,
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
          description: t('errorDeletingAccount'),
        });
        return;
      }

      await supabase.auth.signOut();
      navigate("/");
    } catch (error) {
      toast({
        variant: "destructive",
        description: t('unexpectedError'),
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar title={t('settings')} showBackButton={true} />
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6 pb-16">
          <div className="rounded-lg bg-card p-6 shadow">
            <h2 className="text-lg font-medium">{t('accountSettings')}</h2>
            <Separator className="my-4" />
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setOpenChangePassword(true)}
              >
                {t('changePassword')}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleOpenBlockedUsers}
              >
                {t('blockedUsers')}
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-card p-6 shadow">
            <h2 className="text-lg font-medium">{t('preferences')}</h2>
            <Separator className="my-4" />
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setOpenNotifications(true)}
              >
                {t('notifications')}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setOpenLanguage(true)}
              >
                {t('language')}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setOpenTheme(true)}
              >
                {t('theme')}
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-card p-6 shadow">
            <h2 className="text-lg font-medium text-destructive">{t('dangerZone')}</h2>
            <Separator className="my-4" />
            <div className="space-y-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full justify-start"
                  >
                    {t('deleteAccount')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('deleteAccountTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('deleteAccountDescription')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t('deleteAccount')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </main>

      {/* Change Password Dialog */}
      <Dialog open={openChangePassword} onOpenChange={setOpenChangePassword}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('changePasswordTitle')}</DialogTitle>
            <DialogDescription>
              {t('changePasswordDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-password" className="text-right">
                {t('newPassword')}
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="col-span-3"
                disabled={loadingPassword}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="confirm-password" className="text-right">
                {t('confirmPassword')}
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="col-span-3"
                disabled={loadingPassword}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={loadingPassword}>{t('cancel')}</Button>
            </DialogClose>
            <Button onClick={handleChangePassword} disabled={loadingPassword}>
              {loadingPassword ? t('updating') : t('updatePassword')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog open={openNotifications} onOpenChange={setOpenNotifications}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('notificationSettingsTitle')}</DialogTitle>
            <DialogDescription>
              {t('notificationSettingsDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="push-notifications" className="flex-1">
                {t('pushNotifications')}
              </Label>
              <Switch
                id="push-notifications"
                checked={notificationSettings.pushNotifications}
                onCheckedChange={(checked) =>
                  updateNotificationSettings({ pushNotifications: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="message-notifications" className="flex-1">
                {t('messageNotifications')}
              </Label>
              <Switch
                id="message-notifications"
                checked={notificationSettings.messageNotifications}
                onCheckedChange={(checked) =>
                  updateNotificationSettings({ messageNotifications: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('cancel')}</Button>
            </DialogClose>
            <Button onClick={handleSaveNotifications}>{t('savePreferences')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Language Dialog */}
      <Dialog open={openLanguage} onOpenChange={setOpenLanguage}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('languageSettingsTitle')}</DialogTitle>
            <DialogDescription>
              {t('languageSettingsDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={currentLanguage} onValueChange={setLanguage}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('languageSettingsDescription')} />
              </SelectTrigger>
              <SelectContent>
                {supportedLanguages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.nativeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('cancel')}</Button>
            </DialogClose>
            <Button onClick={handleSaveLanguage}>{t('savePreference')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Theme Dialog */}
      <Dialog open={openTheme} onOpenChange={setOpenTheme}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('themeSettingsTitle')}</DialogTitle>
            <DialogDescription>
              {t('themeSettingsDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Tabs value={theme} className="w-full" onValueChange={setTheme}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="light">{t('light')}</TabsTrigger>
                <TabsTrigger value="dark">{t('dark')}</TabsTrigger>
                <TabsTrigger value="system">{t('system')}</TabsTrigger>
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
              <Button variant="outline">{t('cancel')}</Button>
            </DialogClose>
            <Button onClick={handleSaveTheme}>{t('savePreference')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blocked Users Dialog */}
      <Dialog open={openBlockedUsers} onOpenChange={setOpenBlockedUsers}>
        <DialogContent className="sm:max-w-[500px] max-h-[600px] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t('blockedUsersTitle')}</DialogTitle>
            <DialogDescription>
              {t('blockedUsersDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-[400px] overflow-y-auto">
            {loadingBlockedUsers ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : blockedUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t('noBlockedUsers')}</p>
                <p className="text-sm mt-2">{t('blockedUsersWillAppear')}</p>
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
                          {t('blocked')} {new Date(blockedUser.blocked_at).toLocaleDateString()}
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
                          {t('unblocking')}
                        </>
                      ) : (
                        t('unblock')
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('close')}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
