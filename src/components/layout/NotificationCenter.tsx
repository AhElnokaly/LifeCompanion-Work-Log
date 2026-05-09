import React, { useMemo, useState } from 'react';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Bell, Trophy, CalendarDays, KeySquareIcon, Briefcase } from 'lucide-react';
import { Button, buttonVariants } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { format } from 'date-fns';

export default function NotificationCenter() {
  const { t, lang } = useLanguage();
  const { sessions, settings } = useWorkLog();
  const [open, setOpen] = useState(false);

  const notifications = useMemo(() => {
     const notifs: any[] = [];
     const now = new Date();
     
     // 1. Unused compensations
     const validityDays = settings.compensationValidityDays || 30;
     const availableComps = sessions.filter(s => s.isRestDayWork && !s.isArchived).map(s => {
       let accrued = 0;
       if (s.restDayCompensation === '1_day' || s.restDayCompensation === '1_day_plus_overtime') accrued = 1;
       else if (s.restDayCompensation === '2_days') accrued = 2;
       
       const taken = sessions.filter(t => t.dayStatus === 'compensation' && t.linkedCompensationSessionId === s.id && !t.isArchived).length;
       const daysSinceEarned = (now.getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60 * 24);
       const daysUntilExpiry = Math.floor(validityDays - daysSinceEarned);
       
       return { ...s, availableDays: accrued - taken, daysUntilExpiry };
     }).filter(s => s.availableDays > 0 && s.daysUntilExpiry >= 0);
     
     if (availableComps.length > 0) {
        let totalVal = 0;
        let expiringSoon = false;
        availableComps.forEach(c => {
           totalVal += c.availableDays;
           if (c.daysUntilExpiry < 5 && c.daysUntilExpiry >= 0) expiringSoon = true;
        });
        notifs.push({
           id: 'comps_avail',
           title: t('notif.comps_title'),
           desc: `${t('notif.you_have')} ${totalVal} ${t('notif.comps_days_left')}. ${expiringSoon ? t('notif.expiring_soon') : ''}`,
           icon: <Trophy className="w-4 h-4 text-emerald-500" />,
           color: 'bg-emerald-500/10'
        });
     }

     // 2. Used permissions limit warning
     const currentMonth = now.getMonth();
     const currentYear = now.getFullYear();
     const thisMonthSessions = sessions.filter(s => {
        const d = new Date(s.startTime);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
     });
     
     const totalPermissionHours = thisMonthSessions
        .filter(s => s.dayStatus === 'permission')
        .reduce((acc, s) => {
           // use explicit permissionHours or rely on duration fallback
           const val = s.permissionHours !== undefined ? s.permissionHours : ((s.duration || 0) / 60);
           return acc + val;
        }, 0);

     const allowedPermissions = settings.monthlyPermissions || 0;
     if (allowedPermissions > 0) {
         if (totalPermissionHours >= allowedPermissions) {
             notifs.push({
                id: 'perms_empty',
                title: t('notif.perms_title'),
                desc: t('notif.perms_empty_desc'),
                icon: <KeySquareIcon className="w-4 h-4 text-red-500" />,
                color: 'bg-red-500/10'
             });
         } else if (totalPermissionHours > 0) {
             notifs.push({
                id: 'perms_used',
                title: t('notif.perms_title'),
                desc: `${t('notif.perms_used_desc')} ${allowedPermissions - totalPermissionHours} ${t('notif.hours_left_perms')}.`,
                icon: <KeySquareIcon className="w-4 h-4 text-amber-500" />,
                color: 'bg-amber-500/10'
             });
         }
     }

     // 3. System Welcome message if empty
     if (notifs.length === 0) {
         notifs.push({
            id: 'welcome',
            title: t('notif.welcome_title'),
            desc: t('notif.welcome_desc'),
            icon: <Briefcase className="w-4 h-4 text-blue-500" />,
            color: 'bg-blue-500/10'
         });
     }

     return notifs;
  }, [sessions, settings, t]);

  const unreadCount = notifications.length > 1 ? notifications.length : (notifications[0].id === 'welcome' ? 0 : 1);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={buttonVariants({ variant: 'ghost', size: 'icon'}) + " relative group hover:bg-secondary/20"}>
        <Bell className="h-5 w-5 text-foreground/80 group-hover:text-foreground transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-background rounded-full"></span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-[1.5rem] overflow-hidden border-border/50 shadow-xl" align={lang === 'ar' ? 'start' : 'end'} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="bg-muted/50 p-4 border-b border-border/50 flex items-center justify-between">
           <h3 className="font-bold">{t('notif.center')}</h3>
           <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">{unreadCount}</span>
        </div>
        <div className="max-h-[300px] overflow-y-auto no-scrollbar p-2 flex flex-col gap-2">
           {notifications.map(n => (
              <div key={n.id} className="flex gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors cursor-pointer border border-transparent hover:border-border/30">
                 <div className={`w-9 h-9 rounded-full flex shrink-0 items-center justify-center ${n.color}`}>
                    {n.icon}
                 </div>
                 <div className="flex flex-col gap-0.5 mt-0.5">
                    <span className="text-sm font-bold leading-tight">{n.title}</span>
                    <span className="text-xs text-muted-foreground leading-snug">{n.desc}</span>
                 </div>
              </div>
           ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
