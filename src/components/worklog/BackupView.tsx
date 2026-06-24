import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { DownloadCloud, UploadCloud, Save, RefreshCw, AlertTriangle, FileJson, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { toast } from 'sonner';
import { db } from '../../lib/db';
import { get, set } from 'idb-keyval';
import { useAuth } from '../../contexts/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db as firestoreDb } from '../../lib/firebase';
import { useWorkLog } from '../../contexts/WorkLogContext';

export default function BackupView() {
  const { t, lang } = useLanguage();
  const { updateSettings } = useWorkLog(); // To force re-render/reload settings if needed
  const [hasFileHandle, setHasFileHandle] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Check if we have a saved file handle
    get('backup-file-handle').then((handle) => {
      if (handle) setHasFileHandle(true);
    });
  }, []);

  const generateBackupData = async () => {
    const settingsStr = localStorage.getItem('worklog_settings');
    const settings = settingsStr ? JSON.parse(settingsStr) : {};
    
    return {
      version: 1,
      timestamp: new Date().toISOString(),
      settings,
      sessions: await db.sessions.toArray(),
      jobs: await db.jobs.toArray(),
      shifts: await db.shifts.toArray(),
      moods: await db.moods.toArray(),
      alarms: await db.alarms.toArray(),
      payments: await db.payments.toArray(),
    };
  };

  const getFallbackDownload = async (data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `work_companion_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const syncToCloudIfEnabled = async (data: any) => {
      // Optional: Since there is a cloud sync already running in context, 
      // we might just let normal restore save to local DB and let context handle it, 
      // but to be safe we can force a page reload after restore.
  }

  const handleBackup = async () => {
    setIsProcessing(true);
    try {
      const data = await generateBackupData();
      let usedFallback = false;
      
      if ('showSaveFilePicker' in window) {
        let fileHandle = await get('backup-file-handle');
        try {
          if (fileHandle) {
            // Request permission to write
            const p = typeof fileHandle.queryPermission === 'function' ? await fileHandle.queryPermission({ mode: 'readwrite' }) : 'prompt';
            if (p !== 'granted') {
               const req = typeof fileHandle.requestPermission === 'function' ? await fileHandle.requestPermission({ mode: 'readwrite' }) : 'prompt';
               if (req !== 'granted') {
                 fileHandle = null; // Reset to pick a new file
               }
            }
          }

          if (!fileHandle) {
            fileHandle = await (window as any).showSaveFilePicker({
              suggestedName: `work_companion_backup_${new Date().toISOString().split('T')[0]}.json`,
              types: [{
                description: 'JSON Backup',
                accept: { 'application/json': ['.json'] },
              }],
            });
            await set('backup-file-handle', fileHandle);
            setHasFileHandle(true);
          }

          const writable = await fileHandle.createWritable();
          await writable.write(JSON.stringify(data, null, 2));
          await writable.close();
          localStorage.setItem('last_backup_timestamp', new Date().toISOString());
          toast.success(lang === 'ar' ? 'تم تحديث نسخة الاحتياط بنجاح!' : 'Backup updated successfully!');
        } catch (err: any) {
          if (err.name === 'AbortError') {
            setIsProcessing(false);
            return;
          }
          if (err.name === 'SecurityError' || (err.message && err.message.toLowerCase().includes('cross origin')) || (err.message && err.message.toLowerCase().includes('frame'))) {
            usedFallback = true;
          } else {
            throw err;
          }
        }
      } else {
        usedFallback = true;
      }

      if (usedFallback) {
        await getFallbackDownload(data);
        await set('backup-file-handle', null);
        setHasFileHandle(false);
        localStorage.setItem('last_backup_timestamp', new Date().toISOString());
        toast.success(lang === 'ar' ? 'تم تنزيل النسخة الاحتياطية (تنزيل عادي)' : 'Backup downloaded successfully!');
      }
    } catch (error: any) {
      console.error('Backup error:', error);
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء النسخ الاحتياطي' : 'Error creating backup');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    try {
      let file: File | undefined;
      let usedFallback = false;
      
      if ('showOpenFilePicker' in window) {
        try {
          const [fileHandle] = await (window as any).showOpenFilePicker({
            types: [{
              description: 'JSON Backup',
              accept: { 'application/json': ['.json'] },
            }],
          });
          file = await fileHandle.getFile();
          // Optional: set this as the new backup handle so future updates write here
          await set('backup-file-handle', fileHandle);
          setHasFileHandle(true);
        } catch (err: any) {
          if (err.name === 'AbortError') {
            return;
          }
          if (err.name === 'SecurityError' || (err.message && err.message.toLowerCase().includes('cross origin')) || (err.message && err.message.toLowerCase().includes('frame'))) {
            usedFallback = true;
          } else {
            throw err;
          }
        }
      } else {
        usedFallback = true;
      }

      if (usedFallback) {
        // Fallback for browsers without File System Access API or in iframes
        file = await new Promise((resolve, reject) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json,application/json';
          input.onchange = (e) => {
             const target = e.target as HTMLInputElement;
             if (target.files && target.files.length > 0) resolve(target.files[0]);
             else reject(new Error('No file selected'));
          };
          input.click();
        });
      }

      if (!file) return;
      setIsProcessing(true);

      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed.version) {
         toast.error(lang === 'ar' ? 'ملف غير صالح' : 'Invalid file format');
         return;
      }

      // Restore data to IndexedDB
      await db.transaction('rw', [db.sessions, db.jobs, db.shifts, db.moods, db.alarms, db.payments], async () => {
        if (parsed.sessions?.length) { await db.sessions.clear(); await db.sessions.bulkAdd(parsed.sessions); }
        if (parsed.jobs?.length) { await db.jobs.clear(); await db.jobs.bulkAdd(parsed.jobs); }
        if (parsed.shifts?.length) { await db.shifts.clear(); await db.shifts.bulkAdd(parsed.shifts); }
        if (parsed.moods?.length) { await db.moods.clear(); await db.moods.bulkAdd(parsed.moods); }
        if (parsed.alarms?.length) { await db.alarms.clear(); await db.alarms.bulkAdd(parsed.alarms); }
        if (parsed.payments?.length) { await db.payments.clear(); await db.payments.bulkAdd(parsed.payments); }
      });

      // Restore settings
      if (parsed.settings) {
        localStorage.setItem('worklog_settings', JSON.stringify(parsed.settings));
      }

      localStorage.setItem('last_backup_timestamp', new Date().toISOString());
      toast.success(lang === 'ar' ? 'تم استعادة البيانات بنجاح! سيتم إعادة تحميل الصفحة...' : 'Data restored successfully! Reloading...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Restore error:', error);
        toast.error(lang === 'ar' ? 'فشل استعادة البيانات. تأكد من صحة الملف.' : 'Failed to restore data. Check file validity.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const sessions = await db.sessions.toArray();
      if (sessions.length === 0) {
        toast.error(lang === 'ar' ? 'لا توجد بيانات' : 'No data available');
        return;
      }
      const headers = ['id', 'date', 'type', 'duration_min', 'dayStatus', 'overtime_min', 'notes'];
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + 
        headers.join(',') + "\n" + 
        sessions.map(s => {
          return `${s.id},${new Date(s.startTime).toLocaleDateString()},${s.type},${s.duration || 0},${s.dayStatus},${s.overtimeMinutes || 0},"${(s.notes || '').replace(/"/g, '""')}"`;
        }).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `sessions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(lang === 'ar' ? 'تم تصدير الـ CSV' : 'CSV Exported');
    } catch (err) {
      console.error(err);
      toast.error('Error exporting CSV');
    }
  };

  return (
    <div className={`p-4 md:p-8 animate-in fade-in space-y-6 ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col gap-2">
         <h1 className="text-3xl font-black text-primary flex items-center gap-3">
            <Save className="w-8 h-8 text-indigo-500" />
            {lang === 'ar' ? 'النسخ الاحتياطي والاستعادة' : 'Backup & Restore'}
         </h1>
         <p className="text-sm text-muted-foreground max-w-2xl">
            {lang === 'ar' 
              ? 'تتيح لك هذه الأداة إنشاء نسخة احتياطية من كافة بياناتك محلياً بشكل ذكي. الملف الذي تنشؤه أول مرة سيتم تحديثه داخلياً دون الحاجة لتنزيل ملفات جديدة في كل مرة تضغط فيها على "تحديث النسخة". لتصدير البيانات إلى برامج الجداول يمكنك استخدام خيار التصدير CSV.'
              : 'Smart backup utility. Select a file once, and future updates will overwrite that exact file without creating messy copies. You can also export as CSV for spreadsheets.'}
         </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Backup Card */}
        <Card className="rounded-[2xl] border-border/50 shadow-sm overflow-hidden bg-card relative">
           <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
           <CardHeader>
              <CardTitle className="flex items-center gap-2">
                 <DownloadCloud className="w-5 h-5 text-indigo-500" />
                 {lang === 'ar' ? 'حفظ البيانات' : 'Backup Data'}
              </CardTitle>
              <CardDescription>
                {hasFileHandle 
                  ? (lang === 'ar' ? 'تم تحديد ملف سابق، سيتم إضافة البيانات الجديدة مباشرة إليه.' : 'Linked file detected. Changes will be synced directly.')
                  : (lang === 'ar' ? 'حفظ ملف نسخة احتياطية محلياً. (صيغة JSON)' : 'Save your database to a readable local file (JSON).')
                }
              </CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
              <Button 
                onClick={handleBackup} 
                disabled={isProcessing}
                className="w-full h-12 rounded-xl bg-indigo-500 hover:bg-indigo-600 font-bold"
              >
                 {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : 
                   (hasFileHandle ? (lang === 'ar' ? 'تحديث نسخة الاحتياط' : 'Update Backup File') : (lang === 'ar' ? 'إنشاء نسخة جديدة' : 'Create Backup JSON'))
                 }
              </Button>
              {hasFileHandle && (
                 <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                    {lang === 'ar' ? 'الملف متصل وجاهز للاستقبال' : 'File linked and ready for updates'}
                 </div>
              )}
           </CardContent>
        </Card>

        {/* Restore Card */}
        <Card className="rounded-[2xl] border-border/50 shadow-sm overflow-hidden bg-card relative">
           <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
           <CardHeader>
              <CardTitle className="flex items-center gap-2">
                 <UploadCloud className="w-5 h-5 text-emerald-500" />
                 {lang === 'ar' ? 'استعادة البيانات' : 'Restore Data'}
              </CardTitle>
              <CardDescription>
                {lang === 'ar' ? 'استعادة بيانات من ملف JSON تم حفطه مسبقاً.' : 'Load your data back from a previously saved JSON file.'}
              </CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
              <div className="p-3 bg-red-500/10 text-red-600 border border-red-500/20 rounded-xl flex gap-2 items-start text-xs font-bold leading-relaxed">
                 <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                 <span>{lang === 'ar' ? 'خطير: استعادة نسخة احتياطية ستقوم بحذف الجلسات القديمة واستبدالها بالنسخة المرفوعة.' : 'Warning: Restoring will overwrite existing data arrays.'}</span>
              </div>
              <Button 
                variant="outline"
                onClick={handleRestore} 
                disabled={isProcessing}
                className="w-full h-12 rounded-xl border-emerald-500/30 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 font-bold dark:hover:bg-emerald-950"
              >
                 {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : 
                   (lang === 'ar' ? 'اختيار ملف الاستعادة' : 'Select Restore File')
                 }
              </Button>
           </CardContent>
        </Card>

        {/* CSV Export */}
        <Card className="rounded-[2xl] border-border/50 shadow-sm overflow-hidden bg-card col-span-1 md:col-span-2 relative">
           <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-slate-400 to-gray-500"></div>
           <CardHeader>
              <CardTitle className="flex items-center gap-2">
                 <FileJson className="w-5 h-5 text-slate-500" />
                 {lang === 'ar' ? 'تصدير الجلسات كـ CSV' : 'Export Sessions (CSV)'}
              </CardTitle>
              <CardDescription>
                {lang === 'ar' ? 'يمكنك تصدير كشوف جلساتك لفتحها في برامج مثل Excel و Google Sheets لتحليلها طباعتها.' : 'Download sessions format compatible with Excel and Sheets.'}
              </CardDescription>
           </CardHeader>
           <CardContent>
             <Button 
                variant="secondary"
                onClick={handleExportCSV} 
                className="w-full h-10 rounded-xl font-bold"
              >
                 {lang === 'ar' ? 'تنزيل ملف CSV' : 'Download CSV'}
              </Button>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
