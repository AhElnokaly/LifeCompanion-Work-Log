/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { WorkLogProvider, useWorkLog } from './contexts/WorkLogContext';
import { AICoreProvider } from './contexts/AICoreContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import Dashboard from './components/Dashboard';
import OnboardingView from './components/worklog/OnboardingView';
import { Toaster } from './components/ui/sonner';
import { Button } from './components/ui/button';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState('home');
  const { settings, activeSession, startSession } = useWorkLog();
  const { user, loading, isOfflineMode, signIn, continueOffline } = useAuth();

  useEffect(() => {
    // Handle PWA Shortcuts URL parameters
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (action) {
       // Clear query param to prevent infinite triggers
       window.history.replaceState({}, document.title, window.location.pathname);
       
       if (action === 'checkin' && !activeSession && settings?.onboardingCompleted) {
         setActiveTab('home');
         startSession('salary'); // Start default work session
       }
    }
  }, [activeSession, settings?.onboardingCompleted, startSession]);

  if (loading) {
     return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user && !isOfflineMode) {
     return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6" dir="rtl">
         <div className="bg-card border border-border p-8 rounded-[2rem] shadow-xl flex flex-col items-center max-w-sm w-full text-center">
            <h1 className="text-3xl font-black mb-2 text-primary">رفيق الحياة</h1>
            <p className="text-muted-foreground mb-8 text-sm">سجل دخولك الآن لربط بياناتك السحابية، أو استمر بوضع الأوفلاين للبدء فوراً.</p>
            <div className="w-full flex flex-col gap-3">
               <Button onClick={signIn} className="w-full rounded-xl h-14 text-lg font-bold">تسجيل الدخول (Google)</Button>
               <Button onClick={continueOffline} variant="outline" className="w-full rounded-xl h-14 text-lg font-bold border-border/50 bg-secondary/30 hover:bg-secondary/60">الدخول بدون إنترنت (أوفلاين)</Button>
            </div>
         </div>
       </div>
     );
  }

  if (!settings?.onboardingCompleted) {
    return <OnboardingView />;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <Dashboard activeTab={activeTab} setActiveTab={setActiveTab} />
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <WorkLogProvider>
          <AICoreProvider>
            <AppContent />
            <Toaster position="top-center" dir="rtl" />
          </AICoreProvider>
        </WorkLogProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
