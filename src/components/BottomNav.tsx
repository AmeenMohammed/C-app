
import { Home, PlusSquare, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-white">
      <div className="container mx-auto px-4">
        <div className="flex justify-around py-3">
          <Link 
            to="/home" 
            className={cn(
              "flex flex-col items-center space-y-1",
              location.pathname === "/home" ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Home className="h-6 w-6" />
            <span className="text-xs">Home</span>
          </Link>
          <Link 
            to="/post" 
            className={cn(
              "flex flex-col items-center space-y-1",
              location.pathname === "/post" ? "text-primary" : "text-muted-foreground"
            )}
          >
            <PlusSquare className="h-6 w-6" />
            <span className="text-xs">Post</span>
          </Link>
          <Link 
            to="/profile" 
            className={cn(
              "flex flex-col items-center space-y-1",
              location.pathname === "/profile" ? "text-primary" : "text-muted-foreground"
            )}
          >
            <User className="h-6 w-6" />
            <span className="text-xs">Profile</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
