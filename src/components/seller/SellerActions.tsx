
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
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

interface SellerActionsProps {
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  isBlocked: boolean;
  setIsBlocked: (blocked: boolean) => void;
}

export const SellerActions = ({
  sellerId,
  sellerName,
  sellerAvatar,
  isBlocked,
  setIsBlocked
}: SellerActionsProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);

  const handleContactSeller = () => {
    if (isBlocked) {
      toast.error(t('cannotContactBlockedUser'));
      return;
    }

    navigate(`/messages?userId=${sellerId}`, {
      state: {
        sellerId: sellerId,
        sellerName: sellerName,
        sellerAvatar: sellerAvatar
      }
    });
  };

  const handleBlockUser = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user || !sellerId) {
      toast.error(t('needToBeLoggedInToBlockUsers'));
      return;
    }

    try {
      if (isBlocked) {
        // Unblock user using the RPC function
        const { error } = await supabase
          .rpc('unblock_user', {
            blocker_uuid: user.id,
            blocked_uuid: sellerId
          });

        if (error) {
          console.error('Error unblocking user:', error);
          toast.error(t('failedToUnblockUser'));
        } else {
          setIsBlocked(false);
          toast.success(t('youveUnblockedUser').replace('{name}', sellerName));
        }
      } else {
        // Block user using the RPC function
        const { error } = await supabase
          .rpc('block_user', {
            blocker_uuid: user.id,
            blocked_uuid: sellerId
          });

        if (error) {
          console.error('Error blocking user:', error);
          toast.error(t('failedToBlockUser'));
        } else {
          setIsBlocked(true);
          toast.success(t('youveBlockedUser').replace('{name}', sellerName));
        }
      }
    } catch (error) {
      console.error('Error managing block status:', error);
      toast.error(t('anErrorOccurred'));
    }

    setIsBlockDialogOpen(false);
  };

  return (
    <div className="space-y-2">
      <Button
        className="w-full"
        onClick={handleContactSeller}
        disabled={isBlocked}
        variant={isBlocked ? "secondary" : "default"}
      >
        {isBlocked ? t('cannotContactBlocked') : t('contactSeller')}
      </Button>

      <AlertDialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant={isBlocked ? "destructive" : "outline"}
            className="w-full"
          >
            {isBlocked ? t('unblockUser') : t('blockUser')}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isBlocked ? t('unblockThisUser') : t('blockThisUser')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isBlocked
                ? t('youWillStartSeeingContent').replace('{name}', sellerName)
                : t('youWontSeeContent').replace('{name}', sellerName)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlockUser}>
              {isBlocked ? t('unblock') : t('block')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
