import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PromotionDetails {
  id: string;
  promotion_type: string;
  amount_paid: number | null;
  items: {
    title: string;
    price: number | null;
    currency: string | null;
  } | null;
}

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'checking' | 'success' | 'failed'>('checking');
  const [promotionDetails, setPromotionDetails] = useState<PromotionDetails | null>(null);

  useEffect(() => {
    const handlePaymentCallback = async () => {
      try {
        if (!user) {
          toast.error('Please log in to continue');
          navigate('/');
          return;
        }

        // Get pending promotion ID from localStorage
        const pendingPromotionId = localStorage.getItem('pendingPromotionId');

        if (!pendingPromotionId) {
          console.log('No pending promotion found');
          setStatus('failed');
          return;
        }

        // Get payment status from URL params (Paymob callback)
        const success = searchParams.get('success');
        const paymentId = searchParams.get('id') || searchParams.get('payment_id');
        const transactionId = searchParams.get('transaction_id');

        console.log('Payment callback data:', {
          success,
          paymentId,
          transactionId,
          pendingPromotionId
        });

        // Check if payment was successful
        // Paymob usually sends success=true or success=1 for successful payments
        const isPaymentSuccessful = success === 'true' || success === '1' || success === 'success';

        if (!isPaymentSuccessful) {
          console.log('Payment was not successful');

          // Cancel the pending promotion
          await supabase
            .from('promotions')
            .update({
              status: 'cancelled',
              payment_id: paymentId || 'payment_failed'
            })
            .eq('id', pendingPromotionId);

          setStatus('failed');
          toast.error('Payment was cancelled or failed');
          return;
        }

        // Payment successful - activate the promotion
        const { data: promotion, error } = await supabase
          .from('promotions')
          .update({
            status: 'active',
            payment_id: paymentId || transactionId || `confirmed_${Date.now()}`
          })
          .eq('id', pendingPromotionId)
          .select(`
            *,
            items (
              title,
              price,
              currency
            )
          `)
          .single();

        if (error) {
          console.error('Error activating promotion:', error);
          throw error;
        }

        console.log('✅ Promotion activated successfully:', promotion);

        setPromotionDetails(promotion);
        setStatus('success');

        // Clear the pending promotion ID
        localStorage.removeItem('pendingPromotionId');

        toast.success('🎉 Promotion activated successfully!');

      } catch (error) {
        console.error('Payment callback error:', error);
        setStatus('failed');
        toast.error('Failed to process payment confirmation');
      }
    };

    handlePaymentCallback();
  }, [user, navigate, searchParams]);

  const handleContinue = () => {
    navigate('/promoted-items');
  };

  const handleRetry = () => {
    navigate('/promoted-items');
  };

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
              <h2 className="mt-4 text-xl font-semibold">Processing Payment...</h2>
              <p className="mt-2 text-gray-600">
                Please wait while we confirm your payment and activate your promotion.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
            <CardTitle className="text-2xl text-green-800">Payment Successful!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              Your promotion has been activated successfully.
            </p>

            {promotionDetails && (
              <div className="bg-green-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold text-green-800">Promotion Details:</h3>
                <p className="text-sm text-green-700 mt-1">
                  <strong>Item:</strong> {promotionDetails.items?.title}
                </p>
                <p className="text-sm text-green-700">
                  <strong>Type:</strong> {promotionDetails.promotion_type}
                </p>
                <p className="text-sm text-green-700">
                  <strong>Amount:</strong> {promotionDetails.amount_paid} EGP
                </p>
              </div>
            )}

            <Button onClick={handleContinue} className="w-full">
              View My Promotions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Failed state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <XCircle className="mx-auto h-16 w-16 text-red-600" />
          <CardTitle className="text-2xl text-red-800">Payment Failed</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-4">
            We couldn't process your payment. Your promotion has not been activated.
          </p>

          <div className="space-y-2">
            <Button onClick={handleRetry} className="w-full">
              Try Again
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              Go to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
