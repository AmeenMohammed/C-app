import { ArrowLeft, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";

interface TopBarProps {
  title: string;
  showBackButton?: boolean;
}

export function TopBar({ title, showBackButton = false }: TopBarProps) {
  const navigate = useNavigate();
  const isMobile = useMobile();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {showBackButton && (
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              className="h-auto p-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <span className="font-semibold">{title}</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => navigate("/settings")}
          >
            <Settings2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
