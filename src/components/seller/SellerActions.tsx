
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);

  const handleContactSeller = () => {
    if (isBlocked) {
      toast.error("Cannot contact blocked user");
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
      toast.error("You need to be logged in to block users");
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
          toast.error("Failed to unblock user");
        } else {
          setIsBlocked(false);
          toast.success(`You've unblocked ${sellerName}`);
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
          toast.error("Failed to block user");
        } else {
          setIsBlocked(true);
          toast.success(`You've blocked ${sellerName}`);
        }
      }
    } catch (error) {
      console.error('Error managing block status:', error);
      toast.error("An error occurred");
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
        {isBlocked ? "Cannot Contact (Blocked)" : "Contact Seller"}
      </Button>

      <AlertDialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant={isBlocked ? "destructive" : "outline"}
            className="w-full"
          >
            {isBlocked ? "Unblock User" : "Block User"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isBlocked ? "Unblock this user?" : "Block this user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isBlocked
                ? `You will start seeing ${sellerName}'s content again.`
                : `You won't see ${sellerName}'s content anymore. They won't be notified that you've blocked them.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlockUser}>
              {isBlocked ? "Unblock" : "Block"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
