
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, MessageCircle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
    
    // Special handling for messages routes
    if (location.pathname.startsWith('/messages/')) {
      const sellerId = location.pathname.split('/messages/')[1];
      console.log("Attempted to access messages with seller ID:", sellerId);
    }
  }, [location.pathname]);

  const goBack = () => {
    navigate(-1);
  };

  const goHome = () => {
    navigate("/");
  };

  const goToMessages = () => {
    navigate("/messages");
  };

  // Check if the current path is related to messages
  const isMessagesRoute = location.pathname.startsWith('/messages/');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-6xl font-bold mb-4 text-red-500">404</h1>
        <p className="text-xl text-gray-600 mb-6">Oops! Page not found</p>
        <p className="text-gray-500 mb-6">
          {isMessagesRoute 
            ? "We couldn't find this conversation. It may have been deleted or never existed." 
            : "The page you're looking for doesn't exist or has been moved."}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={goBack}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          
          {isMessagesRoute && (
            <Button 
              onClick={goToMessages}
              variant="outline"
              className="flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              All Messages
            </Button>
          )}
          
          <Button 
            onClick={goHome}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
