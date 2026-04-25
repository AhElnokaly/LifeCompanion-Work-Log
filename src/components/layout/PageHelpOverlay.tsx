import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { HelpCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: string;
}

export default function PageHelpOverlay({ open, onOpenChange, activeTab }: Props) {
  
  const getHelpContent = () => {
    switch(activeTab) {
      case 'home':
        return {
          title: "الرئيسية (لوحة التحكم)",
          desc: "هذه الشاشة هي نقطة البداية. من هنا يمكنك بدء العمل، تسجيل الإجازات، ومعرفة مدى تقدمك في إنجاز ساعات العمل المحددة لك، مع نصائح ذكية يومية."
        };
      case 'week':
        return {
          title: "التقويم الشامل",
          desc: "شاشة التقويم تعرض ثلاثة أقسام: الشهري (لعرض الإجازات والمناسبات الهجرية والميلادية)، الأسبوعي (لمعرفة ساعات العمل الإضافية خلال أسبوع)، واليومي (تفاصيل دقيقة للجلسات مع إمكانية تعديل التوقيت)."
        };
      case 'projects':
        return {
          title: "المشاريع والمهام",
          desc: "هنا يمكنك تقسيم عملك إلى مشاريع فرعية وتسجيل الوقت المقضي لكل منها. ممتاز للعمل الحر أو إذا كنت مدير تتولى مهام متعددة."
        };
      case 'settings':
        return {
          title: "إعدادات رفيق الحياة",
          desc: "المحرك الأساسي لعمل التطبيق. يمكنك هنا تغيير نظام عملك، تحديد أهدافك الأسبوعية والشهرية، تشغيل وحدات إضافية كالمزاج والماليات، ومسح بياناتك."
        };
      case 'aicore':
        return {
          title: "المحرك الذكي (AI Core)",
          desc: "مساعدك الشخصي الذي يحلل إرهاقك ومعدل عملك ثم يتحدث معك. يمكنك هنا سؤاله عن مدى كفاءتك وماهي أنسب أوقات الدوام لك."
        };
      case 'themes':
        return {
          title: "تخصيص المظهر والثيمات",
          desc: "اختر ألوانك المفضلة أو استخدم 'الأوضاع الذكية' مثل وضع التركيز (لحجب المشتتات) أو وضع رمضان."
        };
      case 'workspace':
        return {
          title: "بيئة العمل (الورديات والوظائف)",
          desc: "خصص ألواناً لكل وظيفة ووردية لسهولة تتبعك لها لاحقاً. مناسب إذا كنت تعمل في النبطشيات (متغيرة) أو تدير مقهى ومشروعاً آخرين."
        };
      default:
        return {
          title: "المساعدة",
          desc: "لا توجد تفاصيل محددة لهذه الصفحة، لكن يمكنك استكشافها بحرية!"
        };
    }
  };

  const content = getHelpContent();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[90vw] rounded-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-primary">
            <HelpCircle className="h-6 w-6" />
            {content.title}
          </DialogTitle>
          <DialogDescription className="text-base mt-4 leading-relaxed pt-2">
            {content.desc}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-8 border-t border-border/50 pt-4">
           <h4 className="font-bold text-lg mb-4">الأسئلة الشائعة (Q&A) - أوفلاين</h4>
           <div className="space-y-4 max-h-[40vh] overflow-y-auto no-scrollbar pr-2 pb-6">
              <div className="bg-secondary/30 p-3 rounded-xl">
                 <p className="font-semibold text-sm mb-1 text-primary">كيف يعمل التطبيق بدون إنترنت؟</p>
                 <p className="text-xs text-muted-foreground leading-relaxed">يعمل التطبيق بالكامل محلياً (Local Storage). يتم حفظ كافة ساعاتك ومعلوماتك ولا تُمسح إلا بطلبك. ميزات الذكاء الاصطناعي فقط هي التي تحتاج لإنترنت.</p>
              </div>
              <div className="bg-secondary/30 p-3 rounded-xl">
                 <p className="font-semibold text-sm mb-1 text-primary">أين أجد مخططاتي المحفوظة؟</p>
                 <p className="text-xs text-muted-foreground leading-relaxed">بعد تصميمك لمخطط في "صانع المخططات" والضغط على حفظ، ستجده يظهر في واجهة "محفظتي" (Wallet) لمتابعة وضعك المالي بصرياً.</p>
              </div>
              <div className="bg-secondary/30 p-3 rounded-xl">
                 <p className="font-semibold text-sm mb-1 text-primary">كيف أحسب العمل الإضافي (Overtime)؟</p>
                 <p className="text-xs text-muted-foreground leading-relaxed">من واجهة "الإعدادات"، يمكنك تحديد نظامك: "عمل حر" (بالساعة) أو "راتب ثابت" ثم تحديد عدد الساعات الأسبوعية المطلوبة وأي شيء فوقها يضاف تلقائياً للعمل الإضافي ليُحسب في المحفظة.</p>
              </div>
              <div className="bg-secondary/30 p-3 rounded-xl">
                 <p className="font-semibold text-sm mb-1 text-primary">كيف أُقيّم وضعي النفسي ومستوى الإرهاق؟</p>
                 <p className="text-xs text-muted-foreground leading-relaxed">من خلال قسم "مؤشر الإرهاق" (Burnout) في الصفحة الرئيسية، يتم سؤالك وتحديد مستوى الضغط لديك ويُحفظ ليقوم المساعد الذكي بنصحك بناءً عليه.</p>
              </div>
              <div className="bg-secondary/30 p-3 rounded-xl">
                 <p className="font-semibold text-sm mb-1 text-primary">هل بياناتي آمنة؟ وكيف أنقلها لجهاز آخر؟</p>
                 <p className="text-xs text-muted-foreground leading-relaxed">بياناتك آمنة 100% ولا تُرسل لأي سيرفر (باستثناء سؤالك للذكاء الاصطناعي). يمكنك من "الإعدادات" النقر على "تصدير نسخة احتياطية" لحفظ ملف ببياناتك.</p>
              </div>
              <div className="bg-secondary/30 p-3 rounded-xl border border-dashed border-emerald-500/50 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500"></div>
                 <p className="font-semibold text-sm mb-1 text-emerald-500">هل لديك استفسارات أخرى؟</p>
                 <p className="text-xs text-muted-foreground leading-relaxed">
                    جرب استخدام التطبيق وجرب كل الواجهات. إذا كان هناك شيء غير واضح، يمكنك سؤال "المساعد الذكي للعمل" المدمج في القائمة الجانبية. نحن نطور التطبيق باستمرار بناءً على تجربتك!
                 </p>
              </div>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
