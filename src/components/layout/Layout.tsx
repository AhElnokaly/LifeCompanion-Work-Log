import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import AppLogo from '../ui/AppLogo';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { Moon, Sun, Palette, Brain, Briefcase, Settings, Menu, Home, Calendar, BarChart2, LayoutGrid, MoreHorizontal, History, HelpCircle, MessageCircleQuestion, Wallet, Target, Users, CalendarDays, Download, Bell, Zap, BarChart, ChevronLeft, Share2, Link as LinkIcon, FileDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '../ui/sheet';
import PageHelpOverlay from './PageHelpOverlay';
import EmbeddedAIChat from '../aicore/EmbeddedAIChat';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { theme, setTheme, smartMode, setSmartMode } = useTheme();
  const { settings, sessions, activeSession } = useWorkLog();
  const [chatOpen, setChatOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [burnoutOverlay, setBurnoutOverlay] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installApp = async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    if (outcome === 'accepted') {
      setInstallPromptEvent(null);
    }
  };

  const handleShareLink = async () => {
     try {
        const shareUrl = 'https://lifecompanionworklog.netlify.app/';
        if (navigator.share) {
           await navigator.share({
              title: 'LifeCompanion - Work Log',
              text: 'جرب تطبيق LifeCompanion رفيقك الذكي لإدارة ساعات العمل!',
              url: shareUrl,
           });
        } else {
           await navigator.clipboard.writeText(shareUrl);
           alert('تم نسخ الرابط بنجاح!');
        }
     } catch (err) {
        console.error('Share failed', err);
     }
  };

  const handleDownloadAPK = () => {
     const apkUrl = "https://lifecompanionworklog.netlify.app/lifecompanion.apk";
     window.open(apkUrl, '_blank');
  };

  // Trigger burnout automatically if conditions suggest huge burnout and not previously ignored
  React.useEffect(() => {
     let interval: any;
     if (activeSession) {
        interval = setInterval(() => {
           // Basic logic for burnout: Has worked > 600 mins (10 hours) without closing session
           const sessionDuration = (new Date().getTime() - new Date(activeSession.startTime).getTime()) / 60000;
           if (sessionDuration > 600 && !burnoutOverlay) {
               // Ensure it doesn't trigger repeatedly via some flag or just trigger it once 
               if (!sessionStorage.getItem(`burnout-${activeSession.id}`)) {
                   setBurnoutOverlay(true);
                   sessionStorage.setItem(`burnout-${activeSession.id}`, 'true');
               }
           }
        }, 60000); // Check every minute
     }
     return () => clearInterval(interval);
  }, [activeSession, burnoutOverlay]);

  const isFreelance = settings.system === 'freelance';

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground transition-colors duration-300 w-full overflow-hidden" dir="ltr">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary/20 to-emerald-500/20 shadow-sm relative overflow-hidden flex-shrink-0 flex items-center justify-center p-1 border border-primary/20">
             <AppLogo className="w-full h-full text-primary" />
          </div>
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent leading-none">
            LifeCompanion
            <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-1 text-right">Work Log</span>
          </h1>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setHelpOpen(true)}>
            <HelpCircle className="h-5 w-5 text-emerald-500" />
          </Button>
          {installPromptEvent && (
            <Button variant="ghost" size="icon" onClick={installApp} className="animate-pulse">
              <Download className="h-5 w-5 text-blue-500" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setChatOpen(true)}>
             <MessageCircleQuestion className="h-5 w-5 text-blue-500" />
          </Button>
          <Sheet>
            <SheetTrigger className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-muted text-foreground cursor-pointer focus:outline-none">
                <Menu className="h-6 w-6" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-[320px] p-6 z-[100] bg-background/95 backdrop-blur-xl border-l-0 rounded-l-[2rem] flex flex-col" dir="rtl">
              <SheetHeader className="pb-6 border-b border-border/50">
                <SheetTitle className="text-2xl font-black text-right pt-2 text-foreground">القائمة</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto mt-6 no-scrollbar">
                <div className="flex flex-col gap-2">
                  
                  {/* Pro Upgrade (Placeholder from design) */}
                  <button className="flex items-center w-full p-4 rounded-2xl bg-secondary/30 hover:bg-secondary/50 transition-colors gap-4">
                     <div className="text-orange-500"><Zap className="w-5 h-5" /></div>
                     <span className="font-bold text-orange-500 text-sm">الترقية لبرو</span>
                  </button>

                  <button className="flex items-center w-full p-4 rounded-2xl bg-secondary/30 hover:bg-secondary/50 transition-colors gap-4 mt-2" onClick={() => setActiveTab('wallet')}>
                     <div className="text-foreground/70"><Wallet className="w-5 h-5" /></div>
                     <span className="font-bold text-foreground text-sm">محفظتي</span>
                  </button>

                  <button className="flex items-center w-full p-4 rounded-2xl bg-secondary/30 hover:bg-secondary/50 transition-colors gap-4" onClick={() => setActiveTab('history')}>
                     <div className="text-foreground/70"><History className="w-5 h-5" /></div>
                     <span className="font-bold text-foreground text-sm">الأرشيف والسجل</span>
                  </button>
                  
                  <button className="flex items-center w-full p-4 rounded-2xl bg-secondary/30 hover:bg-secondary/50 transition-colors gap-4" onClick={() => setActiveTab('chart_maker')}>
                     <div className="text-foreground/70"><BarChart className="w-5 h-5" /></div>
                     <span className="font-bold text-foreground text-sm">صانع المخططات</span>
                  </button>
                  
                  <button className="flex items-center w-full p-4 rounded-2xl bg-secondary/30 hover:bg-secondary/50 transition-colors gap-4" onClick={() => setShareOpen(true)}>
                     <div className="text-foreground/70"><Share2 className="w-5 h-5" /></div>
                     <span className="font-bold text-foreground text-sm">مشاركة التطبيق</span>
                  </button>

                  <button className="flex items-center w-full p-4 rounded-2xl bg-secondary/30 hover:bg-secondary/50 transition-colors gap-4 mt-2 border border-border/50" onClick={() => setActiveTab('settings')}>
                     <div className="text-foreground/70"><Settings className="w-5 h-5" /></div>
                     <span className="font-bold text-foreground text-sm">الإعدادات</span>
                  </button>
                  
                  <button className="flex items-center justify-between w-full p-4 rounded-2xl bg-secondary/30 hover:bg-secondary/50 transition-colors mt-2" onClick={() => setActiveTab('alarms')}>
                     <div className="flex items-center gap-4">
                       <div className="text-foreground/70"><Bell className="w-5 h-5" /></div>
                       <span className="font-bold text-foreground text-sm">المنبهات والإشعارات</span>
                     </div>
                     <div className="w-5 h-5 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold">1</div>
                  </button>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-border/50">
                  <Button className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-500/20">
                     تسجيل الدخول <ChevronLeft className="w-5 h-5 mr-2" />
                  </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r p-4 gap-8 bg-card relative z-10">
        <div className="flex items-center gap-2 px-2 relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary/20 to-emerald-500/20 shadow-sm relative overflow-hidden flex-shrink-0 flex items-center justify-center p-1 border border-primary/20">
             <AppLogo className="w-full h-full text-primary" />
          </div>
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent leading-tight">
            LifeCompanion
            <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5">Work Log</span>
          </h1>
        </div>
        <div className="flex justify-between px-2">
          <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)} className="flex-1 ml-2 text-emerald-500">
             <HelpCircle className="w-4 h-4 ml-2" /> مساعدة
          </Button>
          <Button variant="outline" size="sm" onClick={() => setChatOpen(true)} className="flex-1 text-blue-500">
             <MessageCircleQuestion className="w-4 h-4 ml-2" /> اسأل الذكاء
          </Button>
        </div>
        <nav className="flex flex-col gap-2 flex-1">
          <DesktopNavLinks activeTab={activeTab} setActiveTab={setActiveTab} />
          {installPromptEvent && (
            <Button onClick={installApp} className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-lg ring-2 ring-blue-500/20">
              <Download className="w-4 h-4 mr-2" /> تثبيت التطبيق
            </Button>
          )}
        </nav>
        <div className="flex flex-col gap-2 border-t pt-4">
          <ThemeSettings />
          <div className="mt-4 bg-secondary/30 rounded-xl p-3 flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
               U
             </div>
             <div>
               <p className="text-sm font-bold">المستخدم الحالي</p>
               <p className="text-[10px] text-muted-foreground">{settings.system === 'freelance' ? 'نظام حر' : 'موظف بدوام ثابت'}</p>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0 relative">
        <div className="max-w-md mx-auto h-full p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-card/90 backdrop-blur pb-safe px-2 py-2 flex justify-between overflow-x-auto no-scrollbar z-50 min-w-0">
        <div className="flex w-full justify-between min-w-max gap-2 px-1">
          <MobileNavItem icon={Home} label="الرئيسية" id="home" activeTab={activeTab} setActive={setActiveTab} />
          <MobileNavItem icon={Calendar} label="التقويم" id="week" activeTab={activeTab} setActive={setActiveTab} />
          <MobileNavItem icon={Bell} label="المنبه" id="alarms" activeTab={activeTab} setActive={setActiveTab} />
          {settings.system === 'freelance' && (
            <MobileNavItem icon={Users} label="العملاء" id="smartpage" activeTab={activeTab} setActive={setActiveTab} />
          )}
          {settings.system === 'fixed' && (
             <MobileNavItem icon={Target} label="أدائي" id="smartpage" activeTab={activeTab} setActive={setActiveTab} />
          )}
          <MobileNavItem icon={History} label="السجل" id="history" activeTab={activeTab} setActive={setActiveTab} />
          <MobileNavItem icon={MoreHorizontal} label="المزيد" id="more" activeTab={activeTab} setActive={setActiveTab} />
        </div>
      </div>

      <PageHelpOverlay open={helpOpen} onOpenChange={setHelpOpen} activeTab={activeTab} />
      
      {/* Global Sidebar Chat Container */}
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent side="right" className="w-[90vw] sm:w-[450px] p-0 flex flex-col z-[100]">
          <SheetHeader className="p-4 border-b bg-card">
            <SheetTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-indigo-500" />
              المساعد الشخصي الذكي
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden relative">
             <EmbeddedAIChat />
          </div>
        </SheetContent>
      </Sheet>

      {/* Share App Sheet */}
      <Sheet open={shareOpen} onOpenChange={setShareOpen}>
         <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[85vh] p-6 z-[120]">
            <SheetHeader className="pb-4 text-center">
               <SheetTitle className="text-xl font-bold flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-tr from-primary to-emerald-500 p-0.5 rounded-2xl shadow-lg relative overflow-hidden flex-shrink-0">
                     <div className="absolute inset-0 bg-white/20 backdrop-blur-sm" />
                     <div className="w-full h-full bg-card rounded-[14px] flex items-center justify-center relative z-10">
                       <Briefcase className="w-8 h-8 text-emerald-500" />
                     </div>
                  </div>
                  <div>مشاركة LifeCompanion</div>
               </SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-4" dir="rtl">
               <button 
                  onClick={handleShareLink}
                  className="w-full bg-secondary/40 hover:bg-secondary/60 flex items-center gap-4 p-4 rounded-2xl transition-colors border border-border/50"
               >
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                     <LinkIcon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col text-right">
                     <span className="font-bold text-sm">مشاركة كرابط (Link)</span>
                     <span className="text-xs text-muted-foreground mt-0.5">انسخ الرابط أو شاركه مباشرة عبر التطبيقات</span>
                  </div>
               </button>
               
               <button 
                  onClick={handleDownloadAPK}
                  className="w-full bg-secondary/40 hover:bg-secondary/60 flex items-center gap-4 p-4 rounded-2xl transition-colors border border-border/50"
               >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                     <FileDown className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col text-right">
                     <span className="font-bold text-sm">تنزيل التطبيق (APK)</span>
                     <span className="text-xs text-muted-foreground mt-0.5">تحميل نسخة أندرويد لتثبيتها كـ App</span>
                  </div>
               </button>
            </div>
         </SheetContent>
      </Sheet>

      {/* Burnout Interceptor Overlay */}
      {burnoutOverlay && (
        <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-1000">
          <div className="max-w-sm w-full text-center flex flex-col items-center gap-6">
             <div className="relative w-32 h-32 flex items-center justify-center">
               <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping duration-3000" />
               <div className="absolute inset-2 rounded-full border-4 border-primary/40 animate-pulse" />
               <div className="absolute inset-4 rounded-full bg-primary/20 flex items-center justify-center backdrop-blur-sm">
                 <Brain className="w-10 h-10 text-primary" />
               </div>
             </div>
             <div>
               <h2 className="text-2xl font-black mb-2 text-foreground">تحذير: إرهاق جسدي ونفسي</h2>
               <p className="text-muted-foreground text-sm leading-relaxed">
                 لاحظ المساعد الذكي أنك عملت لفترات متواصلة دون استراحة.
                 مؤشر ضغطك الحالي مرتفع جداً. نرجو منك إغلاق الشاشة لمدة دقيقة وتمرين التنفس.
               </p>
             </div>
             
             <div className="w-full bg-secondary/50 rounded-full h-2 mt-4 overflow-hidden">
               <div className="h-full bg-primary animate-[grow_60s_linear_forwards]" style={{width: '0%'}} />
             </div>
             <p className="text-xs text-muted-foreground tabular-nums">يرجى الانتظار (60 ثانية)...</p>
             
             <Button 
               variant="ghost" 
               className="mt-6 text-xs opacity-50 hover:opacity-100"
               onClick={() => setBurnoutOverlay(false)}
             >
               تخطي (لا ينصح به)
             </Button>
          </div>
          <style>{`
            @keyframes grow { to { width: 100%; } }
          `}</style>
        </div>
      )}

    </div>
  );
}

function MobileNavItem({ icon: Icon, label, id, activeTab, setActive }: any) {
  const isActive = activeTab === id;
  return (
    <button 
      onClick={() => setActive(id)}
      className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}
    >
      <Icon className={`h-5 w-5 ${isActive ? 'fill-primary/20' : ''}`} />
      <span className="text-[10px] mt-1">{label}</span>
    </button>
  );
}

function DesktopNavLinks({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) {
  const { settings } = useWorkLog();
  const isFreelance = settings.system === 'freelance';
  const isAdvanced = settings.usageComplexity === 'advanced';
  const showShiftsModule = settings.modules?.shifts;

  let smartLabel = 'تقييم الأداء';
  let smartIcon = Target;
  if (settings.system === 'freelance') { smartLabel = 'إدارة العملاء'; smartIcon = Users; }
  else if (settings.system === 'shifts') { smartLabel = 'سجل البدلات'; smartIcon = Target; }

  const linkGroups = [
    {
      title: "مساحة العمل",
      links: [
        { id: 'home', label: 'الرئيسية', icon: Home },
        { id: 'week', label: 'التقويم الشامل', icon: Calendar },
        { id: 'alarms', label: 'المنبهات والتركيز', icon: Bell },
        { id: 'smartpage', label: smartLabel, icon: smartIcon },
        ...(isFreelance || isAdvanced ? [{ id: 'projects', label: 'المشاريع / المهام', icon: LayoutGrid }] : []),
      ]
    },
    {
      title: "الرصد والبيانات",
      links: [
        { id: 'history', label: 'السجل', icon: History },
        { id: 'wallet', label: 'محفظتي', icon: Wallet },
        { id: 'chart_maker', label: 'صانع المخططات', icon: BarChart },
        ...(isAdvanced ? [{ id: 'reports', label: 'التقارير', icon: BarChart2 }] : []),
      ]
    },
    {
      title: "الإدارة",
      links: [
        ...(isAdvanced ? [{ id: 'aicore', label: 'المحرك الذكي', icon: Brain }] : []),
        { id: 'settings', label: 'الإعدادات', icon: Settings }
      ]
    }
  ];

  return (
    <div className="flex flex-col gap-1 overflow-y-auto no-scrollbar">
      {linkGroups.map((group, groupIdx) => (
        <div key={groupIdx} className="mb-4">
          <p className="text-[10px] font-extrabold text-muted-foreground/60 uppercase tracking-widest px-4 mb-2">{group.title}</p>
          <div className="flex flex-col gap-1">
            {group.links.map((link) => {
              const Icon = link.icon;
              return (
                <Button
                  key={link.id}
                  variant={activeTab === link.id ? 'secondary' : 'ghost'}
                  className={`justify-start h-10 ${activeTab === link.id ? 'font-bold bg-secondary/70 shadow-sm' : 'text-muted-foreground hover:bg-secondary/40'}`}
                  onClick={() => setActiveTab(link.id)}
                >
                  <Icon className={`h-[18px] w-[18px] mr-3 ${activeTab === link.id ? 'text-primary' : ''}`} />
                  {link.label}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
      
      <div className="mt-auto pt-4 border-t border-border/40">
        <Button
          variant="ghost"
          className="justify-start w-full text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 h-10"
          onClick={() => window.open('https://wa.me/201009969653?text=لدي اقتراح أو شكوى بخصوص تطبيق LifeCompanion', '_blank')}
        >
          <HelpCircle className="h-[18px] w-[18px] mr-3" />
          الشكاوى والمقترحات
        </Button>
      </div>
    </div>
  );
}

function ThemeSettings() {
  const { theme, setTheme, smartMode, setSmartMode } = useTheme();
  return (
    <>
      <p className="text-xs text-muted-foreground px-2 mb-2 rtl:text-right">المظهر السريع</p>
      <div className="flex flex-wrap gap-2 px-2">
        <Button variant="outline" size="sm" onClick={() => setTheme('light')} className={theme === 'light' ? 'border-primary flex-1' : 'flex-1'}>فاتح</Button>
        <Button variant="outline" size="sm" onClick={() => setTheme('dark')} className={theme === 'dark' ? 'border-primary flex-1' : 'flex-1'}>داكن</Button>
        <Button variant="outline" size="sm" onClick={() => setSmartMode(smartMode === 'focus' ? null : 'focus')} className={smartMode === 'focus' ? 'border-primary bg-primary/10 w-full mt-1' : 'w-full mt-1'}>
          وضع التركيز
        </Button>
      </div>
    </>
  );
}

