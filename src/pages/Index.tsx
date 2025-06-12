import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Get the page user was trying to access
  const from = location.state?.from?.pathname || '/home';

  // If user is already logged in, redirect them
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.session) {
        toast.success("Signed in successfully!");
        // The useEffect will handle the redirect
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-md w-full">
        <Card className="p-6">
          <div className="mb-6">
            <img
              src="/lovable-uploads/38d2a5ed-2eb4-46ab-a433-bd605baacb7d.png"
              alt="Logo"
              className="w-24 h-auto mx-auto"
            />
            {location.state?.from && (
              <p className="text-sm text-center text-muted-foreground mt-2">
                Please sign in to continue
              </p>
            )}
          </div>
          <form className="space-y-4" onSubmit={handleSignIn}>
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                required
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
                required
              />
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
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
