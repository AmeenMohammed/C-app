import { ArrowLeft, Menu, Bell, Heart, Settings, CreditCard, ArrowUp, LogOut, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface TopBarProps {
  title: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

export function TopBar({ title, showBackButton = true, onBackClick }: TopBarProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      navigate(-1);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
      navigate("/");
    } catch (error) {
      toast.error("Error logging out");
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-white border-b">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center">
          {showBackButton && (
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-lg font-semibold ml-2">{title}</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={scrollToTop}>
              <ArrowUp className="mr-2 h-4 w-4" />
              Move to Top
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/notifications')}>
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/cart')}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              My Cart
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/saved-items')}>
              <Heart className="mr-2 h-4 w-4" />
              Saved Items
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/payment-methods')}>
              <CreditCard className="mr-2 h-4 w-4" />
              Payment Methods
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
