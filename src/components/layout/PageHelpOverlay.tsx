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
      </DialogContent>
    </Dialog>
  );
}
