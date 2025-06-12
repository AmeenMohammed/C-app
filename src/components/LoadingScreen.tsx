import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Loading...",
  fullScreen = true
}) => {
  const containerClass = fullScreen
    ? "min-h-screen flex items-center justify-center bg-gray-50"
    : "flex items-center justify-center py-8";

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};