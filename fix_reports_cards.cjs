const fs = require('fs');
let file = fs.readFileSync('src/components/worklog/ReportsView.tsx', 'utf8');

const newMapStr = `               {groupedSessions.map(([gDate, daySessions]) => {
                  const sDate = new Date(daySessions[0].startTime);
                  const isExpanded = expandedDate === gDate;
                  const hour = sDate.getHours();
                  
                  // Base theme by time
                  let theme = { bg: 'bg-slate-700', text: 'text-slate-100', textDark: 'text-slate-400', bgSoft: 'bg-slate-700/10', border: 'border-slate-700/30' };
                  if (hour >= 5 && hour < 12) theme = { bg: 'bg-amber-500', text: 'text-amber-50', textDark: 'text-amber-500', bgSoft: 'bg-amber-500/10', border: 'border-amber-500/30' };
                  else if (hour >= 12 && hour < 17) theme = { bg: 'bg-blue-500', text: 'text-blue-50', textDark: 'text-blue-500', bgSoft: 'bg-blue-500/10', border: 'border-blue-500/30' };
                  else if (hour >= 17 && hour < 20) theme = { bg: 'bg-purple-500', text: 'text-purple-50', textDark: 'text-purple-500', bgSoft: 'bg-purple-500/10', border: 'border-purple-500/30' };

                  // Find primary status of the day to show on the collapsed card & adjust theme
                  let mainStatus = 'عمل اعتيادي';
                  const leaveSession = daySessions.find(s => s.dayStatus?.includes('leave') || s.dayStatus === 'rest_day_work' || s.dayStatus === 'compensation');
                  
                  if (leaveSession) {
                     if (leaveSession.dayStatus === 'rest_day_work') {
                        mainStatus = 'عمل في يوم راحة (بديلة)';
                     } else if (leaveSession.dayStatus === 'compensation') {
                        mainStatus = 'استهلاك بديلة';
                        theme = { bg: 'bg-orange-500', text: 'text-orange-50', textDark: 'text-orange-600', bgSoft: 'bg-orange-500/10', border: 'border-orange-500/30' };
                     } else if (leaveSession.dayStatus === 'annual_leave') {
                        mainStatus = 'إجازة سنوية / اعتيادية';
                        theme = { bg: 'bg-indigo-500', text: 'text-indigo-50', textDark: 'text-indigo-500', bgSoft: 'bg-indigo-500/10', border: 'border-indigo-500/30' };
                     } else if (leaveSession.dayStatus === 'sick_leave') {
                        mainStatus = 'إجازة مرضية';
                        theme = { bg: 'bg-red-500', text: 'text-red-50', textDark: 'text-red-500', bgSoft: 'bg-red-500/10', border: 'border-red-500/30' };
                     } else if (leaveSession.dayStatus === 'casual_leave') {
                        mainStatus = 'إجازة عارضة';
                     } else if (leaveSession.dayStatus === 'half_day_leave') {
                        mainStatus = 'إجازة نصف يوم';
                     } else {
                        mainStatus = 'إجازة';
                     }
                  } else if (daySessions.some(s => s.dayStatus === 'permission')) {
                     mainStatus = 'تصريح';
                     // If it's just a permission but they worked the rest of the day, we keep the original time theme, 
                     // or we can append it.
                     const workSession = daySessions.find(s => s.dayStatus === 'work');
                     if (workSession) mainStatus = 'عمل + تصريح';
                  }

                  const totalHours = daySessions.reduce((acc, s) => acc + (s.duration || 0), 0);
                  
                  return (
                     <div key={gDate} className={\`rounded-2xl transition-all overflow-hidden border \${isExpanded ? 'shadow-md border-border/80' : 'shadow-none border-border/40 hover:border-border/60'}\`}>
                        {/* Card Header (Collapsed view) */}
                        <div 
                           className={\`\${theme.bgSoft} p-3 sm:p-4 flex items-center justify-between cursor-pointer\`}
                           onClick={() => setExpandedDate(isExpanded ? null : gDate)}
                        >
                           <div className="flex items-center gap-3 w-full">
                              <div className={\`\${theme.bg} \${theme.text} w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold shrink-0 shadow-sm\`}>
                                 <span className="text-sm leading-none">{format(sDate, 'dd')}</span>
                                 <span className="text-[9px] font-medium leading-tight opacity-90">{format(sDate, 'E', { locale: lang === 'ar' ? ar : enUS })}</span>
                              </div>
                              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                 <div className="flex items-center justify-between gap-2 overflow-hidden w-full">
                                     <span className="font-bold text-sm text-foreground flex items-center gap-2 truncate">
                                        {format(sDate, 'MMMM yyyy', { locale: lang === 'ar' ? ar : enUS })}
                                     </span>
                                     <span className={\`\${theme.textDark} text-[10px] bg-background/50 px-2 py-0.5 rounded-full font-bold ml-auto shrink-0 max-w-[120px] truncate text-center\`}>{mainStatus}</span>
                                 </div>
                                 <span className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                                    <Clock className="w-3 h-3 shrink-0" />
                                    {format(sDate, 'hh:mm a')}
                                    {totalHours > 0 && <span>• {formatMinutesToHHMM(totalHours)} {t('t_auto_9')}</span>}
                                 </span>
                              </div>
                           </div>
                           <div className={\`ml-3 sm:ml-4 p-1.5 rounded-full \${theme.bgSoft} \${theme.textDark} shrink-0\`}>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                           </div>
                        </div>

                        {/* Card Content (Expanded view) */}
                        {isExpanded && (
                           <div className="bg-card p-3 sm:p-4 border-t border-border/50 flex flex-col gap-3">
                              {daySessions.map((session, idx) => {
                                 let sessionLabel = 'عمل اعتيادي'; 
                                 if (session.dayStatus === 'rest_day_work') sessionLabel = 'عمل في يوم راحة (بديلة)';
                                 else if (session.dayStatus === 'annual_leave') sessionLabel = 'إجازة سنوية';
                                 else if (session.dayStatus === 'sick_leave') sessionLabel = 'إجازة مرضية';
                                 else if (session.dayStatus === 'casual_leave') sessionLabel = 'إجازة عارضة';
                                 else if (session.dayStatus === 'half_day_leave') sessionLabel = 'نصف يوم عمل / إجازة نصف يوم';
                                 else if (session.dayStatus === 'compensation') sessionLabel = 'استهلاك بديلة';
                                 else if (session.dayStatus === 'permission') sessionLabel = 'تصريح';
                                 else if (session.dayStatus === 'public_holiday') sessionLabel = 'عطلة رسمية';
                                 else if (session.dayStatus === 'absent') sessionLabel = 'غياب';
                                 else if (session.dayStatus === 'late') sessionLabel = 'تأخير';

                                 const hasNotes = session.notes && session.notes.trim().length > 0;
                                 const overtimeHours = session.overtimeMinutes ? Math.floor(session.overtimeMinutes / 60) : 0;

                                 return (
                                    <div key={session.id} className={\`flex flex-col gap-2 p-3 bg-secondary/20 rounded-xl \${idx > 0 ? 'border-t border-border/40 mt-1' : ''}\`}>
                                       <div className="flex items-start justify-between">
                                          <div className="flex flex-col gap-1">
                                             <span className="text-xs font-bold flex items-center gap-1.5">
                                                {sessionLabel}
                                                {session.dayStatus === 'rest_day_work' && <span className="bg-emerald-500/10 text-emerald-500 text-[9px] px-1.5 py-0.5 rounded-full">{t('home.comp_earned')}</span>}
                                             </span>`;

const regex = /\{\s*groupedSessions\.map\(\(\[gDate, daySessions\]\) => \{[\s\S]*?<div className="flex items-start justify-between">\s*<div className="flex flex-col gap-1">\s*<span className="text-xs font-bold flex items-center gap-1\.5">\s*\{sessionLabel\}\s*\{session\.dayStatus === 'rest_day_work' && <span className="bg-emerald-500\/10 text-emerald-500 text-\[9px\] px-1\.5 py-0\.5 rounded-full">\{t\('home\.comp_earned'\)\}<\/span>\}\s*<\/span>/;

file = file.replace(regex, newMapStr);
fs.writeFileSync('src/components/worklog/ReportsView.tsx', file);
console.log("Updated ReportsView");
