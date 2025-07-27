import { useState, useEffect } from "react";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Eye, MessageSquare, Share2, Clock, DollarSign, Star, Plus, RefreshCw, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatPrice } from "@/utils/currency";
import { processPromotionPayment, getPromotionPrice, getPromotionDuration } from "@/utils/stripePayment";
// Removed PaymentMethodSelector and usePaymentMethods since direct Paymob integration doesn't use saved payment methods

import { Link } from "react-router-dom";

interface PromotedItem {
  item_id: string; // UUID as string from database
  title: string;
  price: number;
  currency?: string;
  images: string[];
  promotion_id: string; // UUID as string from database
  promotion_type: string;
  start_date: string;
  end_date: string;
  status: string;
  amount_paid: number;
  total_views: number;
  total_clicks: number;
  total_contacts: number;
  hours_remaining: number;
}

interface UserItem {
  id: string;
  title: string;
  price: number;
  currency?: string;
  images: string[];
  created_at: string;
}

const PromotedItems = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [promotionType, setPromotionType] = useState<"basic" | "standard" | "premium">("basic");
  // Removed selectedPaymentMethodId - direct Paymob integration doesn't use saved payment methods

  const [isPromoting, setIsPromoting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  // Removed payment methods - direct Paymob integration handles payment collection

  // Fetch user's promoted items with analytics
  const { data: promotedItems, isLoading: loadingPromoted, refetch: refetchPromoted } = useQuery({
    queryKey: ['promotedItems', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase.rpc('get_user_promoted_items', {
        user_uuid: user.id
      });

      if (error) {
        console.error('Error fetching promoted items:', error);
        return [];
      }

      return data as PromotedItem[];
    },
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute to update time remaining
  });

  // Fetch user's non-promoted items for promotion
  const { data: availableItems, isLoading: loadingAvailable } = useQuery({
    queryKey: ['availableItems', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('items')
        .select('id, title, price, currency, images, created_at')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching available items:', error);
        return [];
      }

      // Filter out items with ACTIVE promotions only (cancelled/expired items can be promoted again)
      const activePromotedItemIds = new Set(promotedItems?.filter(p => p.status === 'active').map(p => p.item_id) || []);
      return (data as UserItem[]).filter(item => !activePromotedItemIds.has(item.id));
    },
    enabled: !!user && promotedItems !== undefined,
  });

  // Promotion mutation with saved payment methods only
  const promoteMutation = useMutation({
    mutationFn: async ({
      itemId,
      type,
      paymentMethodId
    }: {
      itemId: string;
      type: "basic" | "standard" | "premium";
      paymentMethodId?: string; // Optional for direct Paymob integration
    }) => {
      if (!user) throw new Error("Not authenticated");

      const amount = getPromotionPrice(type);
      const duration = getPromotionDuration(type);

      // First, create promotion as 'pending'
      const { data: promotionData, error: promotionError } = await supabase
        .from('promotions')
        .insert({
          item_id: itemId,
          user_id: user.id,
          promotion_type: type,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + duration * 60 * 60 * 1000).toISOString(),
          amount_paid: amount,
          payment_method: paymentMethodId ? 'saved_method' : 'direct_paymob',
          payment_method_id: paymentMethodId || null, // null for direct integration
          payment_id: `pending_${Date.now()}`, // Temporary ID
          status: 'pending' // Wait for payment confirmation
        })
        .select()
        .single();

      if (promotionError) throw promotionError;

      // Store promotion ID for payment callback
      localStorage.setItem('pendingPromotionId', promotionData.id);

      // Process payment with saved payment method
      const paymentResult = await processPromotionPayment({
        amount,
        currency: 'EGP',
        description: `${type} promotion for item`,
        promotionType: type,
        paymentMethodId, // null for direct integration, or saved payment method ID
      });

      if (!paymentResult.success) {
        // Cancel the pending promotion if payment fails immediately
        await supabase
          .from('promotions')
          .update({ status: 'cancelled' })
          .eq('id', promotionData.id);

        throw new Error(paymentResult.error || 'Payment failed');
      }

      // Update promotion with real payment ID
      const { data, error } = await supabase
        .from('promotions')
        .update({
          payment_id: paymentResult.paymentId || paymentResult.paymentIntentId
        })
        .eq('id', promotionData.id)
        .select()
        .single();

      if (error) throw error;

      // If payment requires action (redirect), don't activate yet
      if (paymentResult.requiresAction || paymentResult.redirectUrl) {
        console.log('💳 Payment requires action - promotion will be activated after payment confirmation');
        return { ...data, pendingPayment: true };
      }

      // For immediate payments (simulation), activate right away
      const { data: activatedData, error: activateError } = await supabase
        .from('promotions')
        .update({ status: 'active' })
        .eq('id', promotionData.id)
        .select()
        .single();

      if (activateError) throw activateError;
      return activatedData;
    },
    onSuccess: (data) => {
      // Only show success message for immediate payments (simulation)
      // For redirect payments, success will be shown on the payment success page
      if (!data?.pendingPayment) {
        toast.success(t('promotionSuccessful'));
      } else {
        toast.info('Redirecting to payment...');
      }

      setSelectedItemId("");
      setShowDialog(false);
      queryClient.invalidateQueries({ queryKey: ['promotedItems'] });
      queryClient.invalidateQueries({ queryKey: ['availableItems'] });
    },
    onError: (error) => {
      console.error('Promotion error:', error);
      toast.error(error instanceof Error ? error.message : t('promotionFailed'));
    },
  });

  // Retry payment mutation for pending promotions
  const retryPaymentMutation = useMutation({
    mutationFn: async (promotionData: { promotionId: string; itemId: string; promotionType: string; amount: number }) => {
      if (!user) throw new Error("Not authenticated");

      // Store promotion ID for payment callback
      localStorage.setItem('pendingPromotionId', promotionData.promotionId);

      // Process payment again
      const paymentResult = await processPromotionPayment({
        amount: promotionData.amount,
        currency: 'EGP',
        description: `${promotionData.promotionType} promotion for item`,
        promotionType: promotionData.promotionType as "basic" | "standard" | "premium",
        paymentMethodId: undefined, // Direct integration
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      // Update promotion with real payment ID
      const { data, error } = await supabase
        .from('promotions')
        .update({
          payment_id: paymentResult.paymentId || paymentResult.paymentIntentId
        })
        .eq('id', promotionData.promotionId)
        .select()
        .single();

      if (error) throw error;

      // If payment requires action (redirect), return pending status
      if (paymentResult.requiresAction || paymentResult.redirectUrl) {
        console.log('💳 Payment requires action - promotion will be activated after payment confirmation');
        return { ...data, pendingPayment: true };
      }

      // For immediate payments (simulation), activate right away
      const { data: activatedData, error: activateError } = await supabase
        .from('promotions')
        .update({ status: 'active' })
        .eq('id', promotionData.promotionId)
        .select()
        .single();

      if (activateError) throw activateError;
      return activatedData;
    },
    onSuccess: (data) => {
      if (!data?.pendingPayment) {
        toast.success('Payment completed! Promotion is now active.');
      } else {
        toast.info('Redirecting to payment...');
      }
      queryClient.invalidateQueries({ queryKey: ['promotedItems'] });
      queryClient.invalidateQueries({ queryKey: ['availableItems'] });
    },
    onError: (error) => {
      console.error('Retry payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Payment retry failed');
    },
  });

  // Cancel promotion mutation
  const cancelMutation = useMutation({
    mutationFn: async (promotionId: string) => {
      const { error } = await supabase
        .from('promotions')
        .update({ status: 'cancelled' })
        .eq('id', promotionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Promotion cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['promotedItems'] });
      queryClient.invalidateQueries({ queryKey: ['availableItems'] });
    },
    onError: (error) => {
      console.error('Cancel error:', error);
      toast.error('Failed to cancel promotion');
    },
  });

  const handlePromote = async () => {
    if (!selectedItemId) {
      toast.error(t('pleaseSelectItem'));
      return;
    }

    // Note: No payment method validation needed for direct Paymob integration
    // User will be redirected to Paymob's payment page to enter payment details

    setIsPromoting(true);
    try {
      await promoteMutation.mutateAsync({
        itemId: selectedItemId,
        type: promotionType,
        paymentMethodId: undefined // No saved payment method for direct Paymob integration
      });
    } finally {
      setIsPromoting(false);
    }
  };

  // Removed auto-select logic - direct Paymob integration doesn't use saved payment methods

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatTimeRemaining = (hours: number) => {
    if (hours <= 0) return t('expired');
    if (hours < 24) return `${hours}h ${t('remaining')}`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h ${t('remaining')}`;
  };

  const getProgressPercentage = (hoursRemaining: number, promotionType: string) => {
    let totalHours = 24; // default basic
    switch (promotionType) {
      case 'basic':
        totalHours = 24;
        break;
      case 'standard':
        totalHours = 48;
        break;
      case 'premium':
        totalHours = 72;
        break;
    }
    return Math.max(0, Math.min(100, (hoursRemaining / totalHours) * 100));
  };

  if (loadingPromoted) {
    return (
      <div className="min-h-screen bg-background pb-16">
        <TopBar title={t('promotedItems')} />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{t('loading')}</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const activePromotions = promotedItems?.filter(item => item.status === 'active') || [];
  const expiredPromotions = promotedItems?.filter(item => item.status !== 'active') || [];
  const pendingCount = promotedItems?.filter(item => item.status === 'pending').length || 0;

  return (
    <div className="min-h-screen bg-background pb-16">
      <TopBar title={t('promotedItems')} />

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Promotion Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">{t('activePromotions')}</p>
                <p className="text-2xl font-bold">{activePromotions.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">{t('totalViews')}</p>
                <p className="text-2xl font-bold">
                  {promotedItems?.reduce((sum, item) => sum + item.total_views, 0) || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">{t('totalContacts')}</p>
                <p className="text-2xl font-bold">
                  {promotedItems?.reduce((sum, item) => sum + item.total_contacts, 0) || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">{t('totalSpent')}</p>
                <p className="text-2xl font-bold">
                  ${promotedItems?.reduce((sum, item) => sum + item.amount_paid, 0).toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Promote New Item Button */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="w-full" size="lg">
              <Plus className="h-5 w-5 mr-2" />
              {t('promoteNewItem')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('promoteItem')}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-foreground">{t('selectItem')}</label>
                <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('chooseItemToPromote')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableItems?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex items-center gap-2">
                          <img
                            src={item.images[0]}
                            alt={item.title}
                            className="w-8 h-8 object-cover rounded"
                          />
                          <div>
                            <p className="font-medium truncate max-w-48">{item.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatPrice(item.price, item.currency)}
                            </p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block text-foreground">{t('promotionType')}</label>
                <Select value={promotionType} onValueChange={(value: "basic" | "standard" | "premium") => setPromotionType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">
                      <div>
                        <p className="font-medium text-foreground">{t('basic')} - {getPromotionPrice('basic')} EGP</p>
                        <p className="text-sm text-muted-foreground">{t('24HoursPromotion')}</p>
                      </div>
                    </SelectItem>
                    <SelectItem value="standard">
                      <div>
                        <p className="font-medium text-foreground">{t('standard')} - {getPromotionPrice('standard')} EGP</p>
                        <p className="text-sm text-muted-foreground">{t('48HoursPromotion')}</p>
                      </div>
                    </SelectItem>
                    <SelectItem value="premium">
                      <div>
                        <p className="font-medium text-foreground">{t('premium')} - {getPromotionPrice('premium')} EGP</p>
                        <p className="text-sm text-muted-foreground">{t('72HoursPromotionPriority')}</p>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Information */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                <h4 className="font-medium mb-2 text-foreground">💳 Payment Method</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  You'll be redirected to Paymob's secure payment page where you can pay with:
                </p>
                <ul className="text-sm text-blue-600 dark:text-blue-400 mt-2 space-y-1">
                  <li>• Credit/Debit Cards (Visa, Mastercard, Meeza)</li>
                  <li>• Mobile Wallets (Fawry, Vodafone Cash, etc.)</li>
                  <li>• Installment Plans</li>
                </ul>
              </div>

              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                <h4 className="font-medium mb-2 text-foreground">{t('promotionBenefits')}</h4>
                <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <li>• {t('appearAtTopOfFeed')}</li>
                  <li>• {t('highlightedWithPromotedBadge')}</li>
                  <li>• {t('higherVisibilityInSearchResults')}</li>
                  <li>• {t('detailedAnalytics')}</li>
                </ul>
              </div>

              {/* Pricing Summary */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Total Cost:</span>
                  <span className="text-lg font-bold text-primary">
                    {getPromotionPrice(promotionType)} EGP
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {promotionType === 'basic' && '24 hours promotion'}
                  {promotionType === 'standard' && '48 hours promotion'}
                  {promotionType === 'premium' && '72 hours premium promotion'}
                </div>
              </div>

              <Button
                onClick={handlePromote}
                disabled={!selectedItemId || isPromoting}
                className="w-full"
              >
                {isPromoting ? t('processing') : t('promoteNow')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Promoted Items List */}
        <Tabs key={`tabs-${activePromotions.length}-${expiredPromotions.length}`} defaultValue="active" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">{t('activePromotions')} ({activePromotions.length})</TabsTrigger>
            <TabsTrigger value="history">
              {t('promotionHistory')} ({expiredPromotions.length})
              {pendingCount > 0 && <span className="ml-1 text-yellow-600">• {pendingCount} pending</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activePromotions.length === 0 ? (
              <Card className="p-8 text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('noActivePromotions')}</h3>
                <p className="text-muted-foreground mb-4">{t('promoteItemsForMoreVisibility')}</p>
              </Card>
            ) : (
              activePromotions.map((item) => (
                <Card key={item.promotion_id} className="p-6">
                  <div className="flex items-start gap-4">
                    <Link to={`/items/${item.item_id}`}>
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    </Link>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link to={`/items/${item.item_id}`}>
                            <h3 className="font-semibold hover:text-primary">{item.title}</h3>
                          </Link>
                          <p className="text-muted-foreground">
                            {formatPrice(item.price, item.currency)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                          <Badge variant="outline">
                            <Star className="h-3 w-3 mr-1" />
                            {item.promotion_type}
                          </Badge>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatTimeRemaining(item.hours_remaining)}
                          </span>
                          <span className="text-muted-foreground">
                            {getProgressPercentage(item.hours_remaining, item.promotion_type).toFixed(0)}% {t('remaining')}
                          </span>
                        </div>
                        <Progress
                          value={getProgressPercentage(item.hours_remaining, item.promotion_type)}
                          className="h-2"
                        />
                      </div>

                      {/* Analytics */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span>{item.total_views} {t('views')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span>{item.total_contacts} {t('contacts')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Share2 className="h-4 w-4 text-muted-foreground" />
                          <span>{item.total_clicks} {t('clicks')}</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelMutation.mutate(item.promotion_id)}
                        disabled={cancelMutation.isPending}
                      >
                        {t('cancelPromotion')}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {expiredPromotions.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('noPromotionHistory')}</h3>
                <p className="text-muted-foreground">{t('pastPromotionsWillAppearHere')}</p>
              </Card>
            ) : (
              expiredPromotions.map((item) => (
                <Card key={item.promotion_id} className={`p-6 ${item.status === 'pending' ? '' : 'opacity-60'}`}>
                  <div className="flex items-start gap-4">
                    <Link to={`/items/${item.item_id}`}>
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    </Link>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link to={`/items/${item.item_id}`}>
                            <h3 className="font-semibold hover:text-primary">{item.title}</h3>
                          </Link>
                          <p className="text-muted-foreground">
                            {formatPrice(item.price, item.currency)}
                          </p>
                        </div>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="block font-medium">{t('duration')}</span>
                          <span>
                            {item.promotion_type === 'basic' ? '24h' :
                             item.promotion_type === 'standard' ? '48h' : '72h'}
                          </span>
                        </div>
                        <div>
                          <span className="block font-medium">{t('views')}</span>
                          <span>{item.total_views}</span>
                        </div>
                        <div>
                          <span className="block font-medium">{t('contacts')}</span>
                          <span>{item.total_contacts}</span>
                        </div>
                        <div>
                          <span className="block font-medium">{t('spent')}</span>
                          <span>${item.amount_paid}</span>
                        </div>
                      </div>

                      {/* Action buttons for pending promotions */}
                      {item.status === 'pending' && (
                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => retryPaymentMutation.mutate({
                              promotionId: item.promotion_id,
                              itemId: item.item_id,
                              promotionType: item.promotion_type,
                              amount: item.amount_paid
                            })}
                            disabled={retryPaymentMutation.isPending}
                          >
                            {retryPaymentMutation.isPending ? t('processing') : 'Retry Payment'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelMutation.mutate(item.promotion_id)}
                            disabled={cancelMutation.isPending}
                          >
                            {cancelMutation.isPending ? t('processing') : t('cancelPromotion')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>


        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default PromotedItems;