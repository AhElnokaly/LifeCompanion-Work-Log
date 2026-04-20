import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { HelpCircle, MessageCircle, Bug, Lightbulb, Phone, Send } from 'lucide-react';
import { useWorkLog } from '../../contexts/WorkLogContext';

export default function SupportQAView() {
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
      q: 'كيف يمكنني تسجيل حضور في وظيفة معينة أو وردية؟',
      a: 'من خلال "إدارة بيئة العمل" (للمستخدمين المتقدمين) يمكنك إضافة وظائفك ووردياتك المختلفة. سيقوم التطبيق بفتح نافذة المساعد الذكي عند الضغط على "بدء الجلسة" لتختار بينها.'
    },
    {
      q: 'هل يعمل التطبيق بدون إنترنت؟',
      a: 'نعم! التطبيق مدعوم بتقنية PWA، يمكنك تثبيته على هاتفك وسيعمل ويحفظ بياناتك محلياً بالكامل.'
    },
    {
      q: 'كيف يمكنني حساب الإجازات والغياب؟',
      a: 'من الشاشة الرئيسية، واضغط على "تسجيل يوم غياب/إجازة" واختر نوع الإجازة. سيقوم التطبيق بخصمها من رصيد إجازاتك المتواجد في الإعدادات.'
    },
    {
      q: 'ما هو المحرك الذكي؟',
      a: 'هو مساعد يعتمد على الذكاء الاصطناعي، يقرأ بيانات أيام عملك، ويحسب الساعات الإضافية والأيام المتتالية دون راحة لينبهك عند وجود خطر احتراق وظيفي أو يقدم نصائح للتوازن.'
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
            <h2 className="text-2xl font-bold">المساعدة والدعم</h2>
            <p className="text-muted-foreground text-sm">الإجابة عن استفساراتك والتواصل معنا</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* FAQs */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg px-1 text-primary flex items-center gap-2">
            <Lightbulb className="w-5 h-5" /> الأسئلة الشائعة
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
            <MessageCircle className="w-5 h-5" /> الشكاوى والمقترحات
          </h3>
          <Card className="p-5 bg-card border-white/5 rounded-2xl flex flex-col gap-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              يسعدنا دائماً سماع أفكارك لتطوير التطبيق، أو مساعدتك في حل أي مشكلة قد تواجهك.
              سيقوم التطبيق بتوجيهك مباشرة لخدمة العملاء عبر WhatsApp.
            </p>
            
            <div className="relative">
              <textarea 
                className="w-full bg-secondary/30 rounded-xl border border-white/10 p-3 text-sm min-h-[120px] focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="اكتب اقتراحك أو مشكلتك هنا..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button 
                onClick={() => sendWhatsApp('تبليغ عن مشكلة')}
                variant="secondary"
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl"
              >
                <Bug className="w-4 h-4 ml-2" /> مشكلة
              </Button>
              <Button 
                onClick={() => sendWhatsApp('اقتراح تطوير')}
                variant="secondary"
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl"
              >
                <Lightbulb className="w-4 h-4 ml-2" /> اقتراح
              </Button>
              <Button 
                onClick={() => sendWhatsApp('شكوى')}
                variant="secondary"
                className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-xl"
              >
                 <Phone className="w-4 h-4 ml-2" /> شكوى
              </Button>
              <Button 
                onClick={() => sendWhatsApp('إشادة وتميز')}
                variant="secondary"
                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-xl"
              >
                 <Send className="w-4 h-4 ml-2" /> إشادة
              </Button>
            </div>
          </Card>

          <Card className="p-4 bg-primary/10 border-primary/20 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex shrink-0 items-center justify-center text-primary">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">التواصل المباشر व्हाट्सएप</p>
              <p className="text-xs text-muted-foreground dir-ltr text-left mt-1">{WHATSAPP_NUMBER}</p>
            </div>
          </Card>
        </div>
      </div>

    </div>
  );
}
