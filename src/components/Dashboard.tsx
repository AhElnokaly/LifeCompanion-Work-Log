import React from 'react';
import { useWorkLog } from '../contexts/WorkLogContext';
import HomeView from './worklog/HomeView';
import CalendarView from './worklog/CalendarView';
import ProjectsView from './worklog/ProjectsView';
import ReportsView from './worklog/ReportsView';
import HistoryView from './worklog/HistoryView';
import SettingsView from './worklog/SettingsView';
import JobsShiftsView from './worklog/JobsShiftsView';
import SupportQAView from './worklog/SupportQAView';
import ArchiveView from './worklog/ArchiveView';
import WalletView from './worklog/WalletView';
import AICore from './aicore/AICore';
import ThemesModes from './themes/ThemesModes';

export default function Dashboard({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) {
  const { settings } = useWorkLog();
  const showShiftsModule = settings.modules?.shifts;

  return (
    <div className="h-full w-full max-w-7xl mx-auto">
      {activeTab === 'home' && <HomeView />}
      {activeTab === 'week' && <CalendarView />}
      {activeTab === 'projects' && <ProjectsView />}
      {activeTab === 'reports' && <ReportsView />}
      {activeTab === 'history' && <HistoryView />}
      {activeTab === 'wallet' && <WalletView />}
      {activeTab === 'settings' && <SettingsView />}
      {activeTab === 'workspace' && <JobsShiftsView />}
      {activeTab === 'support' && <SupportQAView />}
      {activeTab === 'archive' && <ArchiveView />}
      {activeTab === 'aicore' && <AICore />}
      {activeTab === 'themes' && <ThemesModes />}
      {activeTab === 'more' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-300 pb-20 pt-4 px-2">
          <h2 className="text-2xl font-bold mb-4">خيارات إضافية</h2>
          <OptionsCard title="السجل الشهري" desc="تاريخ الدوام والملخص" id="history" onClick={() => setActiveTab('history')} />
          <OptionsCard title="المحفظة (Mahfazty)" desc="الأرباح، التقييم المالي للساعات" id="wallet" onClick={() => setActiveTab('wallet')} />
          <OptionsCard title="أرشيف المهملات" desc="استعادة العمليات المحذوفة" id="archive" onClick={() => setActiveTab('archive')} />
          <OptionsCard title="إعدادات العمل" desc="أنظمة العمل والإجازات" id="settings" onClick={() => setActiveTab('settings')} />
          <OptionsCard title="هندسة الورادي" desc="إدارة الورديات والوظائف المتعددة" id="workspace" onClick={() => setActiveTab('workspace')} />
          <div className="border-t border-border/40 my-2"></div>
          <OptionsCard title="المحرك الذكي" desc="تحليلات ومساعد بالذكاء الاصطناعي" id="aicore" onClick={() => setActiveTab('aicore')} />
          <OptionsCard title="الثيمات والأوضاع" desc="تخصيص الواجهة" id="themes" onClick={() => setActiveTab('themes')} />
          <div className="border-t border-border/40 my-2"></div>
          <OptionsCard title="المساعدة والدعم" desc="أسئلة شائعة، طلبات ومقترحات (WhatsApp)" id="support" onClick={() => setActiveTab('support')} />
        </div>
      )}
    </div>
  );
}

function OptionsCard({ title, desc, id, onClick }: { title: string, desc: string, id: string, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="p-5 border border-white/5 rounded-2xl flex flex-col gap-1 bg-card hover:bg-secondary/40 cursor-pointer transition-colors"
      dir="rtl"
    >
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="text-muted-foreground text-sm">{desc}</p>
    </div>
  );
}
