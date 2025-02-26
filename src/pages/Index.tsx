
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <Card className="p-6">
          <div className="mb-6">
            <img 
              src="/lovable-uploads/c8617c56-ede7-48cb-bc22-a12dda207d7e.png" 
              alt="Logo"
              className="w-24 h-auto mx-auto"
            />
          </div>
          <form className="space-y-4">
            <div>
              <Input 
                type="email" 
                placeholder="Email" 
                className="w-full"
              />
            </div>
            <div>
              <Input 
                type="password" 
                placeholder="Password" 
                className="w-full"
              />
            </div>
            <Button className="w-full" asChild>
              <Link to="/home">Sign In</Link>
            </Button>
            <div className="text-center">
              <Link to="/signup" className="text-sm text-muted-foreground hover:underline">
                Don't have an account? Sign up
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Index;
