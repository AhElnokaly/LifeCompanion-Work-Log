import React from 'react';
import { useWorkLog } from '../contexts/WorkLogContext';
import { useLanguage } from '../contexts/LanguageContext';
import HomeView from './worklog/HomeView';
import CalendarView from './worklog/CalendarView';
import ProjectsView from './worklog/ProjectsView';
import ReportsView from './worklog/ReportsView';
import SettingsView from './worklog/SettingsView';
import JobsShiftsView from './worklog/JobsShiftsView';
import SupportQAView from './worklog/SupportQAView';
import ArchiveView from './worklog/ArchiveView';
import WalletView from './worklog/WalletView';
import SmartPageView from './worklog/SmartPageView';
import AlarmsView from './worklog/AlarmsView';
import ChartMakerView from './worklog/ChartMakerView';
import AICore from './aicore/AICore';
import ThemesModes from './themes/ThemesModes';

import ProVibeView from './worklog/ProVibeView';

export default function Dashboard({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) {
  const { settings } = useWorkLog();
  const { t, lang } = useLanguage();
  const showShiftsModule = settings.modules?.shifts;

  return (
    <div className="h-full w-full max-w-7xl mx-auto">
      {activeTab === 'home' && <HomeView />}
      {activeTab === 'week' && <CalendarView />}
      {activeTab === 'projects' && <ProjectsView />}
      {activeTab === 'reports' && <ReportsView />}
      {activeTab === 'wallet' && <WalletView />}
      {activeTab === 'settings' && <SettingsView />}
      {activeTab === 'workspace' && <JobsShiftsView />}
      {activeTab === 'support' && <SupportQAView />}
      {activeTab === 'archive' && <ArchiveView />}
      {activeTab === 'smartpage' && <SmartPageView />}
      {activeTab === 'alarms' && <AlarmsView />}
      {activeTab === 'chart_maker' && <ChartMakerView />}
      {activeTab === 'aicore' && <AICore />}
      {activeTab === 'themes' && <ThemesModes />}
      {activeTab === 'provibe' && <ProVibeView />}
      {activeTab === 'more' && (
        <div className={`flex flex-col gap-4 animate-in fade-in duration-300 pb-20 pt-4 px-2 ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <h2 className="text-2xl font-bold mb-4">{t('dash.more_options')}</h2>
          <OptionsCard title={t('dash.my_page')} desc={t('dash.my_page_desc')} id="smartpage" onClick={() => setActiveTab('smartpage')} lang={lang} />
          <OptionsCard title={t('layout.chart_maker')} desc={t('dash.chart_maker_desc')} id="chart_maker" onClick={() => setActiveTab('chart_maker')} lang={lang} />
          <OptionsCard title={t('layout.my_wallet')} desc={t('dash.wallet_desc')} id="wallet" onClick={() => setActiveTab('wallet')} lang={lang} />
          <OptionsCard title={t('dash.archive')} desc={t('dash.archive_desc')} id="archive" onClick={() => setActiveTab('archive')} lang={lang} />
          <OptionsCard title={t('dash.work_settings')} desc={t('dash.work_settings_desc')} id="settings" onClick={() => setActiveTab('settings')} lang={lang} />
          <div className="border-t border-border/40 my-2"></div>
          <OptionsCard title={t('layout.ai_core')} desc={t('dash.ai_core_desc')} id="aicore" onClick={() => setActiveTab('aicore')} lang={lang} />
          <OptionsCard title={t('dash.themes')} desc={t('dash.themes_desc')} id="themes" onClick={() => setActiveTab('themes')} lang={lang} />
          <div className="border-t border-border/40 my-2"></div>
          <OptionsCard title={t('dash.support')} desc={t('dash.support_desc')} id="support" onClick={() => setActiveTab('support')} lang={lang} />
        </div>
      )}
    </div>
  );
}

function OptionsCard({ title, desc, id, onClick, lang }: { title: string, desc: string, id: string, onClick: () => void, lang: string }) {
  return (
    <div 
      onClick={onClick}
      className={`p-5 border border-white/5 rounded-2xl flex flex-col gap-1 bg-card hover:bg-secondary/40 cursor-pointer transition-colors ${lang === 'ar' ? 'rtl' : 'ltr'}`}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="text-muted-foreground text-sm">{desc}</p>
    </div>
  );
}
