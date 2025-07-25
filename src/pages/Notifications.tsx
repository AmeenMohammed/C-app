
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useNotificationSettings } from "@/contexts/NotificationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { Bell, MessageCircle, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const Notifications = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { settings } = useNotificationSettings();
  const { notifications, totalUnreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications(settings);

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    markAsRead(notification.id);

    if (notification.type === 'channel' && notification.channelId) {
      navigate(`/channels?channelId=${notification.channelId}`);
    } else if (notification.type === 'conversation' && notification.userId) {
      navigate(`/messages?userId=${notification.userId}`);
    }
  };

  const getNotificationIcon = (type: 'channel' | 'conversation') => {
    return type === 'channel' ? Users : MessageCircle;
  };

  const getNotificationTypeText = (type: 'channel' | 'conversation') => {
    return type === 'channel' ? t('channelNotification') : t('privateMessageNotification');
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <TopBar title={t('notifications')} showBackButton={true} />

      <main className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : notifications.length === 0 ? (
          <Card className="p-8">
            <CardContent className="text-center">
              <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('noNewNotifications')}</h3>
              <p className="text-muted-foreground">
                {t('youreAllCaughtUp')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Header with mark all as read */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{t('notifications')}</h2>
                {totalUnreadCount > 0 && (
                  <Badge variant="secondary">
                    {totalUnreadCount} {totalUnreadCount === 1 ? t('unreadMessage') : t('unreadMessages')}
                  </Badge>
                )}
              </div>

              {notifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                >
                  {t('markAllAsRead')}
                </Button>
              )}
            </div>

            <Separator />

            {/* Notifications List */}
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-3">
                {notifications.map((notification, index) => {
                  const IconComponent = getNotificationIcon(notification.type);

                  return (
                    <Card
                      key={notification.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Icon or Avatar */}
                          <div className="flex-shrink-0">
                            {notification.type === 'conversation' ? (
                              <Avatar className="h-10 w-10">
                                <AvatarImage
                                  src={notification.userAvatar || `https://api.dicebear.com/7.x/avatars/svg?seed=${notification.userName || 'user'}`}
                                />
                                <AvatarFallback>
                                  {notification.userName?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <IconComponent className="h-5 w-5 text-primary" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <h4 className="font-medium text-sm truncate">
                                {notification.type === 'channel'
                                  ? `${t('newMessageIn')} ${notification.title}`
                                  : `${t('newMessageFrom')} ${notification.title}`
                                }
                              </h4>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <Badge variant="secondary" className="text-xs">
                                  {notification.unreadCount}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                                </span>
                              </div>
                            </div>

                            <p className="text-sm text-muted-foreground truncate mb-2">
                              {notification.message}
                            </p>

                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {getNotificationTypeText(notification.type)}
                              </span>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="text-xs h-6 px-2"
                              >
                                {t('markAsRead')}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Notifications;
