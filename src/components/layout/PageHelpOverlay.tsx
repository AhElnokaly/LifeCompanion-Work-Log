import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { HelpCircle } from 'lucide-react';
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: string;
}

export default function PageHelpOverlay({ open, onOpenChange, activeTab }: Props) {
    const { t, lang } = useLanguage();
  
  const getHelpContent = () => {
    switch(activeTab) {
      case 'home':
        return {
          title: t('t_auto_84'),
          desc: t('t_auto_85')
        };
      case 'week':
        return {
          title: t('t_auto_86'),
          desc: t('t_auto_87')
        };
      case 'projects':
        return {
          title: t('t_auto_88'),
          desc: t('t_auto_89')
        };
      case 'settings':
        return {
          title: t('t_auto_90'),
          desc: t('t_auto_91')
        };
      case 'aicore':
        return {
          title: t('t_auto_5'),
          desc: t('t_auto_92')
        };
      case 'themes':
        return {
          title: t('t_auto_93'),
          desc: t('t_auto_94')
        };
      case 'workspace':
        return {
          title: t('t_auto_95'),
          desc: t('t_auto_96')
        };
      default:
        return {
          title: t('t_auto_97'),
          desc: t('t_auto_98')
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
           <h4 className="font-bold text-lg mb-4">{t('t_auto_99')}</h4>
           <div className="space-y-4 max-h-[40vh] overflow-y-auto no-scrollbar pr-2 pb-6">
              <div className="bg-secondary/30 p-3 rounded-xl">
                 <p className="font-semibold text-sm mb-1 text-primary">{t('t_auto_100')}</p>
                 <p className="text-xs text-muted-foreground leading-relaxed">{t('t_auto_101')}</p>
              </div>
              <div className="bg-secondary/30 p-3 rounded-xl">
                 <p className="font-semibold text-sm mb-1 text-primary">{t('t_auto_102')}</p>
                 <p className="text-xs text-muted-foreground leading-relaxed">{t('t_auto_103')}</p>
              </div>
              <div className="bg-secondary/30 p-3 rounded-xl">
                 <p className="font-semibold text-sm mb-1 text-primary">{t('t_auto_104')}</p>
                 <p className="text-xs text-muted-foreground leading-relaxed">{t('t_auto_105')}</p>
              </div>
              <div className="bg-secondary/30 p-3 rounded-xl">
                 <p className="font-semibold text-sm mb-1 text-primary">{t('t_auto_106')}</p>
                 <p className="text-xs text-muted-foreground leading-relaxed">{t('t_auto_107')}</p>
              </div>
              <div className="bg-secondary/30 p-3 rounded-xl">
                 <p className="font-semibold text-sm mb-1 text-primary">{t('t_auto_108')}</p>
                 <p className="text-xs text-muted-foreground leading-relaxed">{t('t_auto_109')}</p>
              </div>
              <div className="bg-secondary/30 p-3 rounded-xl border border-dashed border-emerald-500/50 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500"></div>
                 <p className="font-semibold text-sm mb-1 text-emerald-500">{t('t_auto_110')}</p>
                 <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('t_auto_111')}
                                               </p>
              </div>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
