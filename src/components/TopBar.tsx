import { ArrowLeft, ArrowRight, Menu, Bell, Heart, Settings, ArrowUp, LogOut, ShoppingCart, TrendingUp } from "lucide-react";
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
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface TopBarProps {
  title: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

export function TopBar({ title, showBackButton = true, onBackClick }: TopBarProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { t, isRTL } = useLanguage();

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

  const handleMoveToTop = () => {
    navigate('/promoted-items');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success(t('logout'));
      navigate("/");
    } catch (error) {
      toast.error(t('errorLoggingOut'));
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-background border-b">
      <div className={`container mx-auto px-4 h-14 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className={`${isRTL ? 'ml-1' : 'mr-1'}`}
            >
              {isRTL ? <ArrowRight className={`h-5 w-5`} /> : <ArrowLeft className={`h-5 w-5`} />}
            </Button>
          )}
          <h1 className={`text-lg font-semibold ${showBackButton ? (isRTL ? 'mr-2' : 'ml-2') : ''}`}>
            {title}
          </h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isRTL ? "start" : "end"} className={isRTL ? "rtl" : "ltr"}>
            <DropdownMenuItem onClick={handleMoveToTop} className={`${isRTL ? 'flex-row-reverse' : ''}`}>
              <TrendingUp className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('promotedItems')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/notifications')} className={`${isRTL ? 'flex-row-reverse' : ''}`}>
              <Bell className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('notifications')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/saved-items')} className={`${isRTL ? 'flex-row-reverse' : ''}`}>
              <Heart className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('savedItems')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')} className={`${isRTL ? 'flex-row-reverse' : ''}`}>
              <Settings className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('settings')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className={`${isRTL ? 'flex-row-reverse' : ''}`}>
              <LogOut className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
