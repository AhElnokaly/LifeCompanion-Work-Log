const fs = require('fs');
let file = fs.readFileSync('src/components/worklog/ReportsView.tsx', 'utf8');

file = file.replace(
  `                        } else if (sess.dayStatus === 'half_day_leave') {
                           cardColor = 'border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10';
                           icon = <Palmtree className="w-4 h-4 text-purple-500" />;
                           title = t('home.half_day_leave') || 'نصف يوم';
                        }

                        const isExpanded = expandedLeaveId === sess.id;`,
  `                        } else if (sess.dayStatus === 'half_day_leave') {
                           cardColor = 'border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10';
                           icon = <Palmtree className="w-4 h-4 text-purple-500" />;
                           title = t('home.half_day_leave') || 'نصف يوم';
                        } else if (['permission', 'permission_1h', 'permission_2h'].includes(sess.dayStatus || '')) {
                           cardColor = 'border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10';
                           icon = <Clock className="w-4 h-4 text-indigo-500" />;
                           title = t('home.permission') || 'إذن';
                        } else if (sess.dayStatus === 'public_holiday') {
                           cardColor = 'border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/10 opacity-70';
                           icon = <Palmtree className="w-4 h-4 text-pink-500" />;
                           title = sess.notes || 'عطلة رسمية';
                        } else if (sess.dayStatus === 'rest_day_virtual') {
                           cardColor = 'border-slate-500/30 bg-slate-500/10 hover:bg-slate-500/10 opacity-70';
                           icon = <Calendar className="w-4 h-4 text-slate-500" />;
                           title = t('rep.rest_day') || 'مر يوم راحة أسبوعية';
                        }

                        const isExpanded = expandedLeaveId === sess.id;
                        const isVirtual = (sess as any).isVirtual;`
);

file = file.replace(
  `                                            <span className="font-bold text-sm flex items-center gap-2 truncate">
                                                {title}
                                            </span>`,
  `                                            <span className="font-bold text-sm flex items-center gap-2 truncate">
                                                {title}
                                                {isVirtual && <span className="text-[9px] font-normal bg-background/50 px-1.5 py-0.5 rounded-md border border-white/5 text-muted-foreground mr-2 shrink-0">تلقائي</span>}
                                            </span>`
);

file = file.replace(
  `                                       <div className="flex items-center gap-2">
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10 mx-1" onClick={(e) => { e.stopPropagation(); setEditingSession(sess); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); setDeletingSessionId(sess.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                                       </div>`,
  `                                       {!isVirtual && (
                                          <div className="flex items-center gap-2">
                                             <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10 mx-1" onClick={(e) => { e.stopPropagation(); setEditingSession(sess); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                                             <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); setDeletingSessionId(sess.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                                          </div>
                                       )}`
);

fs.writeFileSync('src/components/worklog/ReportsView.tsx', file);