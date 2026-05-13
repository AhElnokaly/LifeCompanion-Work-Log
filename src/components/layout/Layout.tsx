import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import AppLogo from '../ui/AppLogo';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Moon, Sun, Palette, Brain, Briefcase, Settings, Menu, Home, Calendar, BarChart2, LayoutGrid, MoreHorizontal, History, HelpCircle, MessageCircleQuestion, Wallet, Target, Users, CalendarDays, Download, Bell, Zap, BarChart, ChevronLeft, Share2, Link as LinkIcon, FileDown, Globe } from 'lucide-react';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '../ui/sheet';
import PageHelpOverlay from './PageHelpOverlay';
import EmbeddedAIChat from '../aicore/EmbeddedAIChat';
import NotificationCenter from './NotificationCenter';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  // ... Component logic above stays the same, we add `t`.
  const { theme, setTheme, smartMode, setSmartMode } = useTheme();
  const { settings, sessions, activeSession } = useWorkLog();
  const { t, lang, setLang } = useLanguage();
  const [chatOpen, setChatOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [burnoutOverlay, setBurnoutOverlay] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const { user, signIn, logOut } = useAuth();

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
        const shareUrl = window.location.href; // Use actual app URL
        // In iframes, navigator.share often fails or is blocked, fallback safely
        if (navigator.share) {
           await navigator.share({
              title: 'Work Companion - Work Log',
              text: `${t('layout.try_app')} Work Companion - ${t('layout.smart_companion')}!`,
              url: shareUrl,
           }).catch(() => {
              // Fallback if share cancels or fails
              navigator.clipboard.writeText(shareUrl)
                .then(() => toast.success(t('layout.link_copied')))
                .catch(() => toast.error(t('layout.link_copy_failed')));
           });
        } else {
           await navigator.clipboard.writeText(shareUrl);
           toast.success(t('layout.link_copied'));
        }
     } catch (err) {
        console.error('Error sharing:', err);
        toast.error(t('layout.share_error'));
     }
  };

  const handleDownloadAPK = () => {
     // GitHub Release URL structure. You can replace this with your actual repository URL
     // For example: "https://github.com/Ah-Elnokaly/LifeCompanion/releases/latest/download/app-release.apk"
     toast.success('جاري توجيهك لتحميل التطبيق من GitHub...');
     const githubApkUrl = "https://github.com/your-username/your-repo/releases/latest/download/app-release.apk";
     window.open(githubApkUrl, '_blank');
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
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground transition-colors duration-300 w-full overflow-hidden relative" dir="ltr">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[50vw] h-[50vw] bg-emerald-500/10 rounded-full blur-[100px] opacity-50 dark:opacity-20 animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-0 right-1/4 w-[40vw] h-[40vw] bg-indigo-500/10 rounded-full blur-[100px] opacity-50 dark:opacity-20 animate-pulse" style={{ animationDuration: '10s' }} />
      </div>
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card/80 backdrop-blur-xl relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary/20 to-emerald-500/20 shadow-sm relative overflow-hidden flex-shrink-0 flex items-center justify-center p-1 border border-primary/20 cursor-pointer hover:scale-105 transition-transform" onClick={() => toast('🌟 Work Companion يتمنى لك يوماً سعيداً ومليئاً بالإنجازات!', { icon: '✨', duration: 4000 })}>
             <AppLogo className="w-full h-full text-primary" />
          </div>
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent leading-none">
            Work Companion
            <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-1 text-right">Work Log</span>
          </h1>
        </div>
        <div className="flex gap-1 items-center">
          <NotificationCenter />
          <Button variant="ghost" size="icon" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
             <Globe className="h-5 w-5 text-muted-foreground mr-1" />
             <span className="text-xs font-bold leading-none">{lang === 'ar' ? 'EN' : t('t_auto_72')}</span>
          </Button>
          {installPromptEvent && (
            <Button variant="ghost" size="icon" onClick={installApp} className="animate-pulse">
              <Download className="h-5 w-5 text-blue-500" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
             {theme === 'dark' ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-indigo-500" />}
          </Button>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger render={<button className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-muted text-foreground cursor-pointer focus:outline-none" />}>
                <Menu className="h-6 w-6" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-[320px] p-6 z-[100] bg-background/95 backdrop-blur-xl border-l-0 rounded-l-[2rem] flex flex-col" dir="rtl">
              <SheetHeader className="pb-6 border-b border-border/50">
                <SheetTitle className="text-2xl font-black text-right pt-2 text-foreground">{t('layout.menu')}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto mt-6 no-scrollbar" dir="rtl">
                 <DesktopNavLinks activeTab={activeTab} setActiveTab={(t) => { setActiveTab(t); setMobileMenuOpen(false); }} />
              </div>
              <div className="mt-6 pt-4 border-t border-border/50">
                  {user ? (
                    <Button onClick={logOut} variant="outline" className="w-full h-14 rounded-2xl text-red-500 font-bold text-base border-red-500/30 hover:bg-red-500/10">
                       {t('t_auto_73')}
                                                          </Button>
                  ) : (
                    <Button onClick={signIn} className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-500/20">
                       {t('t_auto_74')} <ChevronLeft className="w-5 h-5 mr-2" />
                    </Button>
                  )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r p-4 gap-8 bg-card relative z-10">
        <div className="flex items-center gap-2 px-2 relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary/20 to-emerald-500/20 shadow-sm relative overflow-hidden flex-shrink-0 flex items-center justify-center p-1 border border-primary/20 cursor-pointer hover:scale-105 transition-transform" onClick={() => toast('🌟 Work Companion يعزز من إنتاجيتك وصحتك، استمر!', { icon: '🚀', duration: 4000 })}>
             <AppLogo className="w-full h-full text-primary" />
          </div>
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent leading-tight">
            Work Companion
            <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5">Work Log</span>
          </h1>
        </div>
        <div className="flex justify-between px-2">
          <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)} className="flex-1 ml-2 text-emerald-500">
             <HelpCircle className="w-4 h-4 ml-2" /> {t('t_auto_75')}
                                </Button>
          <Button variant="outline" size="sm" onClick={() => setChatOpen(true)} className="flex-1 text-blue-500">
             <MessageCircleQuestion className="w-4 h-4 ml-2" /> {t('t_auto_76')}
                                </Button>
        </div>
        <nav className="flex flex-col gap-2 flex-1">
          <DesktopNavLinks activeTab={activeTab} setActiveTab={setActiveTab} />
          {installPromptEvent && (
            <Button onClick={installApp} className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-lg ring-2 ring-blue-500/20">
              <Download className="w-4 h-4 mr-2" /> {t('t_auto_77')}
                                      </Button>
          )}
        </nav>
        <div className="flex flex-col gap-2 border-t pt-4">
          <ThemeSettings />
          {user ? (
             <div className="mt-4 bg-secondary/30 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                   {user.photoURL ? (
                      <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full object-cover border border-border" />
                   ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </div>
                   )}
                   <div className="overflow-hidden">
                     <p className="text-sm font-bold truncate">{user.displayName || t('layout.user')}</p>
                     <p className="text-[10px] text-muted-foreground truncate">{settings.system === 'freelance' ? t('layout.freelance') : t('layout.fixed_employee')}</p>
                   </div>
                </div>
                <Button variant="ghost" size="icon" onClick={logOut} className="text-red-500 hover:bg-red-500/10 shrink-0" title={t('t_auto_73')}>
                   <FileDown className="w-4 h-4 rotate-90" />
                </Button>
             </div>
          ) : (
             <div className="mt-4 bg-secondary/30 rounded-xl p-3 flex flex-col items-center gap-2">
                <p className="text-xs text-muted-foreground font-bold">{t('layout.sync_disabled')}</p>
                <Button onClick={signIn} className="w-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white">{t('layout.login')}</Button>
             </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0 relative">
        <div className="max-w-md mx-auto h-full p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-card/90 backdrop-blur pb-safe px-6 py-2 flex justify-between overflow-x-auto no-scrollbar z-50 min-w-0">
        <div className="flex w-full justify-between min-w-max gap-4 px-1">
          <MobileNavItem icon={History} label={t('nav.reports')} id="reports" activeTab={activeTab} setActive={setActiveTab} />
          <MobileNavItem icon={Home} label={t('nav.home')} id="home" activeTab={activeTab} setActive={setActiveTab} />
          <MobileNavItem icon={Calendar} label={t('nav.calendar')} id="week" activeTab={activeTab} setActive={setActiveTab} />
          {settings.isPro && (
             <MobileNavItem icon={Zap} label="Pro Vibe" id="provibe" activeTab={activeTab} setActive={setActiveTab} />
          )}
        </div>
      </div>

      <PageHelpOverlay open={helpOpen} onOpenChange={setHelpOpen} activeTab={activeTab} />
      
      {/* Global Sidebar Chat Container */}
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent side="right" className="w-[90vw] sm:w-[450px] p-0 flex flex-col z-[100]">
          <SheetHeader className="p-4 border-b bg-card">
            <SheetTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-indigo-500" />
              {t('layout.smart_assistant')}
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
                  <div>{t('layout.share')} Work Companion</div>
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
                     <span className="font-bold text-sm">{t('layout.share_as_link')} (Link)</span>
                     <span className="text-xs text-muted-foreground mt-0.5">{t('layout.copy_or_share')}</span>
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
                     <span className="font-bold text-sm">{t('layout.download_app')} (APK)</span>
                     <span className="text-xs text-muted-foreground mt-0.5">{t('layout.download_android')} App</span>
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
               <h2 className="text-2xl font-black mb-2 text-foreground">{t('layout.warning')}: {t('layout.exhaustion')}</h2>
               <p className="text-muted-foreground text-sm leading-relaxed">
                 {t('layout.exhaustion_msg1')}
                 {t('layout.exhaustion_msg2')}
               </p>
             </div>
             
             <div className="w-full bg-secondary/50 rounded-full h-2 mt-4 overflow-hidden">
               <div className="h-full bg-primary animate-[grow_60s_linear_forwards]" style={{width: '0%'}} />
             </div>
             <p className="text-xs text-muted-foreground tabular-nums">{t('layout.wait')} (60 {t('layout.seconds')})...</p>
             
             <Button 
               variant="ghost" 
               className="mt-6 text-xs opacity-50 hover:opacity-100"
               onClick={() => setBurnoutOverlay(false)}
             >
               {t('t_auto_78')}
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
  const { t } = useLanguage();
  const isFreelance = settings.system === 'freelance';
  const isAdvanced = settings.usageComplexity === 'advanced';
  const showShiftsModule = settings.modules?.shifts;

  let smartLabel = t('layout.performance_review');
  let smartIcon = Target;
  if (settings.system === 'freelance') { smartLabel = t('layout.client_mgmt'); smartIcon = Users; }
  else if (settings.system === 'shifts') { smartLabel = t('layout.compensation_log'); smartIcon = Target; }

  const linkGroups = [
    {
      title: t('nav.workspace'),
      links: [
        { id: 'home', label: t('nav.home'), icon: Home },
        { id: 'week', label: t('nav.calendar'), icon: Calendar },
        { id: 'alarms', label: t('layout.alarms_focus'), icon: Bell },
        { id: 'smartpage', label: smartLabel, icon: smartIcon },
        ...(isFreelance || isAdvanced ? [{ id: 'projects', label: t('layout.projects_tasks'), icon: LayoutGrid }] : []),
      ]
    },
    {
      title: t('layout.monitoring_data'),
      links: [
        { id: 'reports', label: t('nav.reports'), icon: History },
        { id: 'wallet', label: t('layout.my_wallet'), icon: Wallet },
        { id: 'chart_maker', label: t('layout.chart_maker'), icon: BarChart },
        { id: 'provibe', label: 'Pro Vibe', icon: Zap },
      ]
    },
    {
      title: t('layout.management'),
      links: [
        ...(isAdvanced ? [{ id: 'aicore', label: t('layout.ai_core'), icon: Brain }] : []),
        { id: 'settings', label: t('nav.settings'), icon: Settings }
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
          onClick={() => window.open(t('t_auto_79'), '_blank')}
        >
          <HelpCircle className="h-[18px] w-[18px] mr-3" />
          {t('t_auto_80')}
                          </Button>
      </div>
    </div>
  );
}

function ThemeSettings() {
  const { theme, setTheme, smartMode, setSmartMode } = useTheme();
  const { lang, setLang, t } = useLanguage();
  return (
    <>
      <p className="text-xs text-muted-foreground px-2 mb-2 rtl:text-right">{t('layout.appearance_lang')}</p>
      <div className="flex flex-wrap gap-2 px-2">
        <Button variant="outline" size="sm" onClick={() => setTheme('light')} className={theme === 'light' ? 'border-yellow-500 text-yellow-600 bg-yellow-500/10 flex-1' : 'flex-1'}>
          <Sun className="w-4 h-4 mr-2" /> {t('t_auto_81')}
                          </Button>
        <Button variant="outline" size="sm" onClick={() => setTheme('dark')} className={theme === 'dark' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 flex-1' : 'flex-1'}>
          <Moon className="w-4 h-4 mr-2" /> {t('t_auto_82')}
                          </Button>
        <Button variant="outline" size="sm" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="w-full mt-1">
          <Globe className="w-4 h-4 mr-2" /> {lang === 'ar' ? 'English' : t('t_auto_83')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setSmartMode(smartMode === 'focus' ? null : 'focus')} className={smartMode === 'focus' ? 'border-primary text-primary bg-primary/10 w-full mt-1' : 'w-full mt-1'}>
          <Target className="w-4 h-4 mr-2" /> {t('layout.focus_mode')}
        </Button>
      </div>
    </>
  );
}

