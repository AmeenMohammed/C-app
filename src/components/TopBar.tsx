
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface TopBarProps {
  title: string;
  showBackButton?: boolean;
}

export function TopBar({ title, showBackButton = true }: TopBarProps) {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-50 bg-white border-b">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center">
          {showBackButton && (
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-lg font-semibold ml-2">{title}</h1>
        </div>
      </div>
    </div>
  );
}
