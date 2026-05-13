const fs = require('fs');
let file = fs.readFileSync('src/components/worklog/HomeView.tsx', 'utf8');

// Inject new state
file = file.replace(
  /const \[retroIsRest, setRetroIsRest\] = useState\(false\);/,
  `const [retroIsRest, setRetroIsRest] = useState(false);
  const [markHolidayDialogOpen, setMarkHolidayDialogOpen] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState('');`
);

// Add quick action button if not a rest day and not working
file = file.replace(
  /<button onClick=\{\(\) => setIsLeaveSheetOpen\(true\)\}/,
  `{!isTodayRestDay && !activeSession && !isOnFullDayLeave && (
             <button onClick={() => setMarkHolidayDialogOpen(true)} className="col-span-2 rounded-2xl p-3 flex items-center justify-center gap-3 transition-colors text-right h-[50px] shadow-sm bg-card hover:bg-card/80 border border-border/50 group mb-2 mt-1">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-500 transition-transform group-hover:scale-110">
                   <Calendar className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-foreground leading-tight flex-1">تعيين كعطلة رسمية والعمل (بديلة)</span>
             </button>
           )}
           <button onClick={() => setIsLeaveSheetOpen(true)}`
);

// Add the dialog at the bottom
file = file.replace(
  /\{showHalfDayPrompt\.show && \(/,
  `{markHolidayDialogOpen && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center backdrop-blur-sm bg-background/60 p-4">
           <div className="bg-card border border-border p-6 rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-8" dir="rtl">
              <h3 className="text-lg font-bold text-center">تعيين اليوم كعطلة رسمية</h3>
              <p className="text-sm text-muted-foreground text-center">سيتم إضافة اليوم لعطلاتك الرسمية وتستطيع الدخول للعمل كـ (بديلة).</p>
              <Input 
                 placeholder="اسم العطلة (مثل: ذكرى المولد النبوي)"
                 value={newHolidayName}
                 onChange={e => setNewHolidayName(e.target.value)}
                 className="h-12 rounded-xl"
              />
              <div className="flex flex-col gap-2 mt-2">
                 <Button className="w-full rounded-xl h-12 flex items-center justify-center font-bold" onClick={() => {
                    if(!newHolidayName) { toast.error('يرجى إدخال اسم العطلة'); return; }
                    const dStr = format(now, 'yyyy-MM-dd');
                    const cHol = settings.customHolidays || {};
                    cHol[dStr] = newHolidayName;
                    updateSettings({ ...settings, customHolidays: cHol });
                    toast.success('تمت إضافة العطلة بنجاح');
                    setMarkHolidayDialogOpen(false);
                    setCompensationTypeDialogOpen(true); // Open the compensation flow
                 }}>
                    تأكيد والبدء
                 </Button>
                 <Button variant="ghost" className="w-full rounded-xl h-12" onClick={() => setMarkHolidayDialogOpen(false)}>إلغاء</Button>
              </div>
           </div>
        </div>
      )}
      
      {showHalfDayPrompt.show && (`
);

fs.writeFileSync('src/components/worklog/HomeView.tsx', file);
