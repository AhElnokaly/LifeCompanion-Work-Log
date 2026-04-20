import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { Moon, Sun, Palette, Brain, Briefcase, Settings, Menu, Home, Calendar, BarChart2, LayoutGrid, MoreHorizontal, History, HelpCircle, MessageCircleQuestion, Wallet } from 'lucide-react';
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
  const [burnoutOverlay, setBurnoutOverlay] = useState(false);

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
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground transition-colors duration-300" dir="ltr">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-emerald-500 p-0.5 shadow-lg relative overflow-hidden flex-shrink-0">
            <div className="absolute inset-0 bg-white/20 backdrop-blur-sm" />
            <div className="w-full h-full bg-card rounded-[10px] flex items-center justify-center relative z-10">
              <Briefcase className="w-5 h-5 text-emerald-500" />
              <span className="absolute bottom-0 right-0.5 text-[9px] font-black text-primary">LC</span>
            </div>
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
          <Button variant="ghost" size="icon" onClick={() => setChatOpen(true)}>
             <MessageCircleQuestion className="h-5 w-5 text-blue-500" />
          </Button>
          <Sheet>
            <SheetTrigger className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-muted text-foreground cursor-pointer focus:outline-none">
                <Menu className="h-6 w-6" />
            </SheetTrigger>
            <SheetContent side="right" className="w-64 z-[100]">
              <nav className="flex flex-col gap-4 mt-8">
                <Button variant="ghost" className="justify-start" onClick={() => setActiveTab('aicore')}>
                  <Brain className="mr-2 h-5 w-5" /> AI Core
                </Button>
                <Button variant="ghost" className="justify-start" onClick={() => setActiveTab('themes')}>
                  <Palette className="mr-2 h-5 w-5" /> Themes & Modes
                </Button>
                <Button variant="ghost" className="justify-start" onClick={() => setActiveTab('settings')}>
                  <Settings className="mr-2 h-5 w-5" /> Settings
                </Button>
                <ThemeSettings />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r p-4 gap-8 bg-card relative z-10">
        <div className="flex items-center gap-2 px-2 relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-emerald-500 p-0.5 shadow-lg relative overflow-hidden flex-shrink-0">
            <div className="absolute inset-0 bg-white/20 backdrop-blur-sm" />
            <div className="w-full h-full bg-card rounded-[10px] flex items-center justify-center relative z-10">
              <Briefcase className="w-5 h-5 text-emerald-500" />
              <span className="absolute bottom-0 right-0.5 text-[9px] font-black text-primary">LC</span>
            </div>
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-card/90 backdrop-blur pb-safe px-2 py-2 flex justify-between z-50">
        <MobileNavItem icon={Home} label="الرئيسية" id="home" activeTab={activeTab} setActive={setActiveTab} />
        <MobileNavItem icon={Calendar} label="التقويم" id="week" activeTab={activeTab} setActive={setActiveTab} />
        {isFreelance || settings.usageComplexity === 'advanced' ? (
          <MobileNavItem icon={LayoutGrid} label="المهام" id="projects" activeTab={activeTab} setActive={setActiveTab} />
        ) : null}
        <MobileNavItem icon={Briefcase} label="ورادي" id="workspace" activeTab={activeTab} setActive={setActiveTab} />
        <MobileNavItem icon={MoreHorizontal} label="المزيد" id="more" activeTab={activeTab} setActive={setActiveTab} />
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

  const links = [
    { id: 'home', label: 'الرئيسية', icon: Home },
    { id: 'week', label: 'التقويم الشامل', icon: Calendar },
    ...(isFreelance || isAdvanced ? [{ id: 'projects', label: 'المشاريع / المهام', icon: LayoutGrid }] : []),
    ...(isAdvanced ? [{ id: 'reports', label: 'التقارير', icon: BarChart2 }] : []),
    { id: 'wallet', label: 'محفظتي', icon: Wallet },
    { id: 'history', label: 'السجل', icon: History },
    { id: 'workspace', label: 'هندسة الورادي', icon: Briefcase },
    ...(isAdvanced ? [{ id: 'aicore', label: 'المحرك الذكي', icon: Brain }] : []),
    { id: 'settings', label: 'الإعدادات', icon: Settings }
  ];

  return (
    <>
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <Button
            key={link.id}
            variant={activeTab === link.id ? 'secondary' : 'ghost'}
            className={`justify-start ${activeTab === link.id ? 'font-bold bg-secondary/50' : ''}`}
            onClick={() => setActiveTab(link.id)}
          >
            <Icon className="h-5 w-5 mr-3" />
            {link.label}
          </Button>
        );
      })}
      
      <Button
        variant="ghost"
        className="justify-start text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
        onClick={() => window.open('https://wa.me/201009969653?text=لدي اقتراح أو شكوى بخصوص تطبيق LifeCompanion', '_blank')}
      >
        <HelpCircle className="h-5 w-5 mr-3" />
        الشكاوى والمقترحات
      </Button>
    </>
  );
}

function ThemeSettings() {
  const { theme, setTheme, smartMode, setSmartMode } = useTheme();
  return (
    <>
      <p className="text-xs text-muted-foreground px-2 mb-2 rtl:text-right">المظهر السريع</p>
      <div className="flex flex-wrap gap-2 px-2">
        <Button variant="outline" size="sm" onClick={() => setTheme('light')} className={theme === 'light' ? 'border-primary' : ''}>فاتح</Button>
        <Button variant="outline" size="sm" onClick={() => setTheme('dark')} className={theme === 'dark' ? 'border-primary' : ''}>داكن</Button>
        <Button variant="outline" size="sm" onClick={() => setTheme('egyptian')} className={theme === 'egyptian' ? 'border-primary' : ''}>مصري</Button>
        <Button variant="outline" size="sm" onClick={() => setTheme('modern')} className={theme === 'modern' ? 'border-primary' : ''}>مودرن</Button>
        <Button variant="outline" size="sm" onClick={() => setTheme('desert')} className={theme === 'desert' ? 'border-primary' : ''}>صحراوي</Button>
        <Button variant="outline" size="sm" onClick={() => setSmartMode(smartMode === 'focus' ? null : 'focus')} className={smartMode === 'focus' ? 'border-primary bg-primary/10 w-full mt-1' : 'w-full mt-1'}>
          وضع التركيز
        </Button>
      </div>
    </>
  );
}

