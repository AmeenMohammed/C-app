
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { HelpCircle, Mail, MessageCircle, Phone } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useLanguage } from "@/contexts/LanguageContext";

const HelpSupport = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background pb-16">
      <TopBar title={t('helpSupport')} showBackButton={true} />
      <main className="container mx-auto px-4 py-6">
        <div className="rounded-lg bg-card p-6 shadow">
          <h2 className="text-lg font-medium mb-4">{t('howCanWeHelpYou')}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Button variant="outline" className="h-24 flex-col">
              <MessageCircle className="h-6 w-6 mb-2" />
              {t('liveChat')}
            </Button>
            <Button variant="outline" className="h-24 flex-col">
              <Mail className="h-6 w-6 mb-2" />
              {t('emailSupport')}
            </Button>
            <Button variant="outline" className="h-24 flex-col">
              <Phone className="h-6 w-6 mb-2" />
              {t('phoneSupport')}
            </Button>
            <Button variant="outline" className="h-24 flex-col">
              <HelpCircle className="h-6 w-6 mb-2" />
              {t('faqs')}
            </Button>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default HelpSupport;
