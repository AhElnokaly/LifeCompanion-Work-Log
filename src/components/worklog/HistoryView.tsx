import React, { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Trash2, Edit2, History, AlertCircle, FileText, CheckCircle2, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';

export default function HistoryView() {
  const { sessions, deleteSession, updateSession, settings } = useWorkLog();
  const [editingSession, setEditingSession] = useState<any>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredSessions = useMemo(() => {
    let filtered = sessions.filter(s => !s.isArchived);
    
    if (filterType !== 'all') {
       if (filterType === 'regular') {
         filtered = filtered.filter(s => s.dayStatus === 'work');
       } else {
         filtered = filtered.filter(s => s.dayStatus === filterType);
       }
    }

    if (searchQuery.trim() !== '') {
      const qs = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        (s.notes && s.notes.toLowerCase().includes(qs)) || 
        (format(new Date(s.startTime), 'yyyy-MM-dd').includes(qs))
      );
    }

    return filtered.reverse();
  }, [sessions, filterType, searchQuery]);

  // Summary stats for demo purposes
  const activeSessions = sessions.filter(s => !s.isArchived);
  const totalHours = activeSessions.reduce((acc, s) => acc + ((s.duration || 0) / 60), 0);
  const totalOvertime = activeSessions.reduce((acc, s) => acc + ((s.overtimeMinutes || 0) / 60), 0);
  const totalPermissions = activeSessions.filter(s => s.isPermission).length * (settings.monthlyPermissions > 0 ? 1 : 0); // Dummy calculation
  const totalLeaves = activeSessions.filter(s => s.isAnnualLeave).length;

  const handleEditSave = () => {
    if (editingSession) {
      updateSession(editingSession.id, editingSession);
      setEditingSession(null);
    }
  };

  const confirmDelete = () => {
    if (deletingSessionId) {
      deleteSession(deletingSessionId);
      setDeletingSessionId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pb-20 px-2 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <header className="flex items-center justify-between mb-2 mt-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">السجل الشهري</h2>
            <p className="text-muted-foreground text-sm">تاريخ العمل وملخص الشهر</p>
          </div>
        </div>
      </header>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-2 gap-3 shrink-0">
        <Card className="p-4 rounded-2xl bg-card border-white/5">
            <span className="text-xs text-muted-foreground mb-1 block">ساعات العمل</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{totalHours.toFixed(1)}</span>
            </div>
        </Card>
        <Card className="p-4 rounded-2xl bg-yellow-600/20 border-yellow-500/20 text-yellow-500">
            <span className="text-xs opacity-80 mb-1 block">ساعات إضافية</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{totalOvertime.toFixed(1)}</span>
            </div>
        </Card>
        {settings.system !== 'freelance' && (
          <>
            <Card className="p-4 rounded-2xl bg-card border-white/5">
                <span className="text-xs text-muted-foreground mb-1 block">إجازات سنوية</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{totalLeaves}</span>
                  <span className="text-xs text-muted-foreground">/ {settings.annualLeaves}</span>
                </div>
            </Card>
            <Card className="p-4 rounded-2xl bg-card border-white/5">
                <span className="text-xs text-muted-foreground mb-1 block">تصاريح (ساعات)</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{totalPermissions}</span>
                  <span className="text-xs text-muted-foreground">/ {settings.monthlyPermissions}</span>
                </div>
            </Card>
          </>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-4 pb-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3 px-2 mt-4 shrink-0">
          <h3 className="font-bold text-lg self-start md:self-center">سجل الأيام</h3>
          <div className="flex w-full md:w-auto gap-2">
            <Input 
              type="text" 
              placeholder="ابحث بالتاريخ أو الملاحظة..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 bg-card border-none rounded-xl text-sm"
              dir="rtl"
            />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[160px] h-10 bg-card border-none rounded-xl shrink-0 min-w-0" dir="rtl">
                <Filter className="w-4 h-4 ml-2" />
                <SelectValue placeholder="تصفية..." />
              </SelectTrigger>
              <SelectContent dir="rtl" className="min-w-[160px]">
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="regular">عمل اعتيادي</SelectItem>
                <SelectItem value="half_day">إجازة نصف يوم</SelectItem>
                <SelectItem value="rest_day_work">عمل يوم راحة</SelectItem>
                <SelectItem value="permission">تصاريح</SelectItem>
                <SelectItem value="annual_leave">إجازة اعتيادية</SelectItem>
                <SelectItem value="sick_leave">إجازة مرضية</SelectItem>
                <SelectItem value="casual_leave">إجازة عارضة</SelectItem>
                <SelectItem value="compensation">أيام بديلة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="overflow-x-auto bg-card rounded-2xl border border-white/5">
          <table className="w-full text-sm text-right whitespace-nowrap">
            <thead className="bg-secondary/40 text-muted-foreground border-b border-border/40">
              <tr>
                <th className="p-3 font-medium">التاريخ</th>
                <th className="p-3 font-medium">الحالة</th>
                <th className="p-3 font-medium">الدخول</th>
                <th className="p-3 font-medium">الخروج</th>
                <th className="p-3 font-medium">المدة (ساعات)</th>
                <th className="p-3 font-medium">الإضافي</th>
                <th className="p-3 font-medium">ملاحظات</th>
                <th className="p-3 font-medium text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filteredSessions.map((session) => {
                const sDate = new Date(session.startTime);
                const eDate = session.endTime ? new Date(session.endTime) : null;
                
                let statusLabel = 'عمل اعتيادي';
                if (session.dayStatus === 'rest_day_work') statusLabel = 'عمل يوم راحة';
                else if (session.dayStatus === 'annual_leave') statusLabel = 'إجازة سنوية';
                else if (session.dayStatus === 'casual_leave') statusLabel = 'إجازة عارضة';
                else if (session.dayStatus === 'sick_leave') statusLabel = 'إجازة مرضية';
                else if (session.dayStatus === 'half_day') statusLabel = 'نصف يوم';
                else if (session.dayStatus === 'permission') statusLabel = 'تصريح/مأمورية';
                else if (session.dayStatus === 'compensation') statusLabel = 'يوم بديل';
                else if (session.location === 'home') statusLabel = 'عمل من المنزل';
                else if (session.location === 'client') statusLabel = 'عمل خارجي';

                return (
                  <tr key={session.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="p-3 flex items-center gap-2">
                       <span className="font-bold">{format(sDate, 'dd/MM/yyyy')}</span>
                       <span className="text-xs text-muted-foreground">{format(sDate, 'EEEE', { locale: ar })}</span>
                    </td>
                    <td className="p-3">
                       <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${session.dayStatus === 'rest_day_work' ? 'bg-red-500/10 text-red-500' : session.dayStatus === 'annual_leave' || session.dayStatus === 'compensation' ? 'bg-emerald-500/10 text-emerald-500' : session.dayStatus === 'permission' || session.dayStatus === 'half_day' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-primary/10 text-primary'}`}>
                         {statusLabel}
                       </span>
                    </td>
                    <td className="p-3">{format(sDate, 'hh:mm a')}</td>
                    <td className="p-3">{eDate ? format(eDate, 'hh:mm a') : 'الآن'}</td>
                    <td className="p-3 font-medium">{session.duration ? (session.duration / 60).toFixed(1) : '-'}</td>
                    <td className="p-3 text-yellow-500">{session.overtimeMinutes ? `+${(session.overtimeMinutes / 60).toFixed(1)}` : '-'}</td>
                    <td className="p-3 max-w-[150px] truncate text-xs" title={session.notes || session.restDayCompensation}>
                       {session.restDayCompensation && <span className="text-red-400 font-bold ml-1">[تعويض]</span>}
                       {session.notes || '-'}
                    </td>
                    <td className="p-3 text-center">
                       <div className="flex items-center justify-center gap-1">
                          {/* Edit Dialog */}
                          <Dialog>
                            <DialogTrigger render={<Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditingSession(session)} />}>
                               <Edit2 className="w-4 h-4 text-primary" />
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]" dir="rtl">
                              <DialogHeader>
                                <DialogTitle>تعديل السجل</DialogTitle>
                              </DialogHeader>
                              {editingSession && (
                                <div className="space-y-4 py-4 whitespace-normal text-start">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>وقت الدخول</Label>
                                      <Input 
                                        type="datetime-local" 
                                        value={format(new Date(editingSession.startTime), "yyyy-MM-dd'T'HH:mm")}
                                        onChange={(e) => setEditingSession({...editingSession, startTime: e.target.value})}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>وقت الخروج</Label>
                                      <Input 
                                        type="datetime-local" 
                                        value={editingSession.endTime ? format(new Date(editingSession.endTime), "yyyy-MM-dd'T'HH:mm") : ''}
                                        onChange={(e) => setEditingSession({...editingSession, endTime: e.target.value})}
                                      />
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>التعليق</Label>
                                    <Input 
                                      value={editingSession.notes || ''} 
                                      onChange={(e) => setEditingSession({...editingSession, notes: e.target.value})} 
                                    />
                                  </div>
                                  {editingSession.isRestDayWork && (
                                    <div className="space-y-2">
                                      <Label>طريقة التعويض (يوم الراحة)</Label>
                                      <Select 
                                        value={editingSession.restDayCompensation} 
                                        onValueChange={(v) => setEditingSession({...editingSession, restDayCompensation: v})}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="اختر طريقة التعويض" />
                                        </SelectTrigger>
                                        <SelectContent dir="rtl">
                                          <SelectItem value="1_day">بديلة بيوم واحد</SelectItem>
                                          <SelectItem value="2_days">بديلة بيومين</SelectItem>
                                          <SelectItem value="1_day_plus_overtime">يوم و إضافي</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                </div>
                              )}
                              <DialogFooter>
                                <Button onClick={handleEditSave} className="w-full">حفظ التغييرات</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          {/* Delete Dialog */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setDeletingSessionId(session.id)} className="h-8 w-8 p-0 hover:bg-red-500/10">
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] whitespace-normal text-start" dir="rtl">
                              <DialogHeader>
                                <DialogTitle>تأكيد الحذف</DialogTitle>
                              </DialogHeader>
                              <div className="py-4">
                                <p>هل أنت متأكد من حذف هذا السجل بشكل نهائي؟ لا يمكن التراجع عن هذه الخطوة.</p>
                              </div>
                              <DialogFooter className="flex gap-2">
                                <Button onClick={confirmDelete} variant="destructive" className="flex-1">حذف نهائي</Button>
                                <Button onClick={() => setDeletingSessionId(null)} variant="outline" className="flex-1">إلغاء</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                       </div>
                    </td>
                  </tr>
                );
              })}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-muted-foreground">
                    لا توجد سجلات بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
