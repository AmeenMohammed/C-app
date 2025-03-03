
import { Link } from "react-router-dom";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link to="/home" className={`block ${className}`}>
      <img 
        src="/lovable-uploads/27f5ba03-896a-40f4-8967-3a15ed47f56c.png" 
        alt="Company Logo" 
        className="h-8 w-auto" 
      />
    </Link>
  );
}
