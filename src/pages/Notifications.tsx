
import { TopBar } from "@/components/TopBar";
import { Bell } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useLanguage } from "@/contexts/LanguageContext";

const Notifications = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background pb-16">
      <TopBar title={t('notifications')} showBackButton={true} />
      <main className="container mx-auto px-4 py-6">
        <div className="rounded-lg bg-card p-6 shadow">
          <div className="flex items-center justify-center h-32">
            <Bell className="h-12 w-12 text-gray-400" />
          </div>
          <p className="text-center text-gray-600">{t('noNewNotifications')}</p>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Notifications;
