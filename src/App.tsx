/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { WorkLogProvider, useWorkLog } from './contexts/WorkLogContext';
import { AICoreProvider } from './contexts/AICoreContext';
import Layout from './components/layout/Layout';
import Dashboard from './components/Dashboard';
import OnboardingView from './components/worklog/OnboardingView';

function AppContent() {
  const [activeTab, setActiveTab] = useState('home');
  const { settings, activeSession, startSession } = useWorkLog();

  useEffect(() => {
    // Handle PWA Shortcuts URL parameters
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (action) {
       // Clear query param to prevent infinite triggers
       window.history.replaceState({}, document.title, window.location.pathname);
       
       if (action === 'checkin' && !activeSession && settings.onboardingCompleted) {
         setActiveTab('home');
         startSession('salary'); // Start default work session
       }
    }
  }, [activeSession, settings.onboardingCompleted, startSession]);

  if (!settings.onboardingCompleted) {
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
    <ThemeProvider>
      <WorkLogProvider>
        <AICoreProvider>
          <AppContent />
        </AICoreProvider>
      </WorkLogProvider>
    </ThemeProvider>
  );
}
