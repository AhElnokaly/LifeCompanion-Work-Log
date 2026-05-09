import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { HelpCircle, MessageCircle, Bug, Lightbulb, Phone, Send } from 'lucide-react';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { useLanguage } from "@/contexts/LanguageContext";

export default function SupportQAView() {
    const { t, lang } = useLanguage();
  const [feedback, setFeedback] = useState('');
  const WHATSAPP_NUMBER = '01009969653';

  const sendWhatsApp = (type: string) => {
    if (!feedback.trim()) return;
    const text = encodeURIComponent(`*${type}*\n${feedback}\n\n---\nمُرسَل من تطبيق LifeCompanion`);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
    window.open(url, '_blank');
    setFeedback('');
  };

  const faqs = [
    {
      q: t('t_auto_474'),
      a: t('t_auto_475')
    },
    {
      q: t('t_auto_476'),
      a: t('t_auto_477')
    },
    {
      q: t('t_auto_478'),
      a: t('t_auto_479')
    },
    {
      q: t('t_auto_480'),
      a: t('t_auto_481')
    }
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 pt-4 px-2" dir="rtl">
      
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{t('t_auto_482')}</h2>
            <p className="text-muted-foreground text-sm">{t('t_auto_483')}</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* FAQs */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg px-1 text-primary flex items-center gap-2">
            <Lightbulb className="w-5 h-5" /> {t('t_auto_484')}
                                </h3>
          <div className="flex flex-col gap-3">
            {faqs.map((faq, i) => (
              <Card key={i} className="p-4 bg-card border-white/5 rounded-2xl">
                <h4 className="font-bold text-sm mb-2">{faq.q}</h4>
                <p className="text-muted-foreground text-xs leading-relaxed">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Contact/Feedback */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg px-1 text-primary flex items-center gap-2">
            <MessageCircle className="w-5 h-5" /> {t('t_auto_80')}
                                </h3>
          <Card className="p-5 bg-card border-white/5 rounded-2xl flex flex-col gap-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('t_auto_485')}
                                      </p>
            
            <div className="relative">
              <textarea 
                className="w-full bg-secondary/30 rounded-xl border border-white/10 p-3 text-sm min-h-[120px] focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={t('t_auto_486')}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button 
                onClick={() => sendWhatsApp(t('t_auto_487'))}
                variant="secondary"
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl"
              >
                <Bug className="w-4 h-4 ml-2" /> {t('t_auto_488')}
                                            </Button>
              <Button 
                onClick={() => sendWhatsApp(t('t_auto_489'))}
                variant="secondary"
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl"
              >
                <Lightbulb className="w-4 h-4 ml-2" /> {t('t_auto_263')}
                                            </Button>
              <Button 
                onClick={() => sendWhatsApp(t('t_auto_264'))}
                variant="secondary"
                className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-xl"
              >
                 <Phone className="w-4 h-4 ml-2" /> {t('t_auto_264')}
                                            </Button>
              <Button 
                onClick={() => sendWhatsApp(t('t_auto_490'))}
                variant="secondary"
                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-xl"
              >
                 <Send className="w-4 h-4 ml-2" /> {t('t_auto_265')}
                                            </Button>
            </div>
          </Card>

          <Card 
            className="p-4 bg-primary/10 border-primary/20 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-primary/20 transition-colors"
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('Hello, I need support with LifeCompanion App')}`, '_blank')}
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex shrink-0 items-center justify-center text-primary">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">{t('t_auto_491')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('t_auto_492')}</p>
            </div>
          </Card>
        </div>
      </div>

    </div>
  );
}
