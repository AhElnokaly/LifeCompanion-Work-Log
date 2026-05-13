const fs = require('fs');
let file = fs.readFileSync('src/components/worklog/SettingsView.tsx', 'utf8');

file = file.replace(
  /const \[newHolidayName, setNewHolidayName\] = useState\(''\);/,
  `const [newHolidayName, setNewHolidayName] = useState('');
  const [restDayChangeDialog, setRestDayChangeDialog] = useState(false);
  const [restDayChangeDate, setRestDayChangeDate] = useState('');`
);

file = file.replace(
  /const handleSave = \(\) => \{[\s\S]*?toast\.success\(t\('settings\.auto\.1'\)\);\n  \};/,
  `const handleSave = () => {
    const originalRestDays = [...settings.restDays].sort().join(',');
    const newRestDays = [...localSettings.restDays].sort().join(',');
    if (originalRestDays !== newRestDays) {
       setRestDayChangeDialog(true);
    } else {
       updateSettings(localSettings);
       toast.success(t('settings.auto.1'));
    }
  };

  const applyRestDayChange = (mode: 'always' | 'from_date') => {
     let newSettings = { ...localSettings };
     if (mode === 'from_date') {
        if (!restDayChangeDate) { toast.error('يرجى اختيار التاريخ'); return; }
        const currentSchedule = newSettings.restDaysSchedule || [];
        newSettings.restDaysSchedule = [
          ...currentSchedule,
          { fromDate: restDayChangeDate, restDays: localSettings.restDays, originalRestDays: settings.restDays }
        ];
     } else {
        // Always -> reset schedule
        newSettings.restDaysSchedule = [];
     }
     
     updateSettings(newSettings);
     toast.success(t('settings.auto.1'));
     setRestDayChangeDialog(false);
  };`
);

// Inject dialog
file = file.replace(
  /\{activeTab === 'general' && \(/,
  `{restDayChangeDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border p-6 rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col gap-4" dir="rtl">
            <h3 className="text-xl font-bold text-center">تغيير أيام الاجازة الأسبوعية</h3>
            <p className="text-sm text-muted-foreground text-center">متى تريد أن يتم تطبيق هذه التغييرات؟</p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => applyRestDayChange('always')} className="rounded-xl h-12">دائماً (تحديث كل السجلات السابقة والقادمة)</Button>
              <div className="flex flex-col gap-2 mt-4 p-4 border border-border rounded-xl bg-secondary/30">
                 <span className="text-sm font-bold">بدءاً من تاريخ معين:</span>
                 <Input type="date" value={restDayChangeDate} onChange={(e) => setRestDayChangeDate(e.target.value)} className="h-12 rounded-xl" />
                 <Button onClick={() => applyRestDayChange('from_date')} variant="secondary" className="rounded-xl h-12">تطبيق من هذا التاريخ</Button>
              </div>
              <Button onClick={() => setRestDayChangeDialog(false)} variant="ghost" className="rounded-xl h-12 mt-2">إلغاء</Button>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'general' && (`
);

fs.writeFileSync('src/components/worklog/SettingsView.tsx', file);
