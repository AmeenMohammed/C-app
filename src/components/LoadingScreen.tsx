import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message,
  fullScreen = true
}) => {
  const { t } = useLanguage();
  const displayMessage = message || t('loading');
  const containerClass = fullScreen
    ? "min-h-screen flex items-center justify-center bg-background"
    : "flex items-center justify-center py-8";

  return (
    <div className={containerClass}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">{displayMessage}</p>
      </div>
    </div>
  );
};