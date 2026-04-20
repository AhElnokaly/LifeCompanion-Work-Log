import React, { useState, useEffect } from 'react';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Play, Square, Coffee, Clock, Briefcase, Focus, Plus } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Label } from '../ui/label';

export default function WorkLog() {
  const { activeSession, startSession, endSession, sessions, projects, addProject } = useWorkLog();
  const { smartMode, setSmartMode } = useTheme();
  const [elapsed, setElapsed] = useState(0);
  const [focusTimeLeft, setFocusTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isFocusActive, setIsFocusActive] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectRate, setNewProjectRate] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('none');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession) {
      interval = setInterval(() => {
        setElapsed(differenceInMinutes(new Date(), new Date(activeSession.startTime)));
      }, 60000);
      setElapsed(differenceInMinutes(new Date(), new Date(activeSession.startTime)));
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isFocusActive && focusTimeLeft > 0) {
      interval = setInterval(() => {
        setFocusTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (focusTimeLeft === 0) {
      setIsFocusActive(false);
      setSmartMode(null);
      // Play sound or notify
    }
    return () => clearInterval(interval);
  }, [isFocusActive, focusTimeLeft, setSmartMode]);

  const toggleFocusMode = () => {
    if (!isFocusActive) {
      setSmartMode('focus');
      setIsFocusActive(true);
      if (focusTimeLeft === 0) setFocusTimeLeft(25 * 60);
    } else {
      setSmartMode(null);
      setIsFocusActive(false);
    }
  };

  const handleAddProject = () => {
    if (newProjectName) {
      addProject({
        name: newProjectName,
        clientName: 'عميل جديد',
        hourlyRate: Number(newProjectRate) || 0,
      });
      setNewProjectName('');
      setNewProjectRate('');
    }
  };

  const totalMinutesToday = sessions
    .filter(s => new Date(s.startTime).toDateString() === new Date().toDateString())
    .reduce((acc, s) => acc + (s.duration || 0), 0);

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}س ${m}د`;
  };

  const formatTimeLeft = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">سجل العمل</h2>
        <p className="text-muted-foreground">مديرك المالي والإداري الشخصي.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عمل اليوم</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(totalMinutesToday + elapsed)}</div>
            <Progress value={Math.min(((totalMinutesToday + elapsed) / 480) * 100, 100)} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">من أصل 8 ساعات</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الأوفرتايم (هذا الأسبوع)</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">4س 30د</div>
            <p className="text-xs text-muted-foreground mt-2">+1.5 يوم إجازة مستحقة</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className={activeSession ? 'border-primary shadow-md' : ''}>
          <CardHeader>
            <CardTitle>تسجيل الحضور</CardTitle>
            <CardDescription>
              {activeSession 
                ? `بدأ العمل في ${format(new Date(activeSession.startTime), 'hh:mm a', { locale: ar })}`
                : 'جاهز لبدء يوم عمل جديد؟'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${activeSession ? 'bg-primary text-primary-foreground animate-pulse' : 'bg-muted text-muted-foreground'}`}>
                  {formatDuration(elapsed)}
                </div>
                <div>
                  <p className="font-medium">{activeSession ? 'جاري العمل...' : 'متوقف'}</p>
                  {activeSession && activeSession.projectId && (
                    <p className="text-sm text-muted-foreground">
                      مشروع: {projects.find(p => p.id === activeSession.projectId)?.name || 'غير معروف'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {!activeSession && (
              <div className="space-y-2">
                <Label>المشروع (اختياري)</Label>
                <div className="flex gap-2">
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر مشروعاً" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون مشروع (راتب ثابت)</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Dialog>
                    <DialogTrigger render={<Button variant="outline" size="icon" />}>
                      <Plus className="h-4 w-4" />
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>إضافة مشروع جديد</DialogTitle>
                        <DialogDescription>أدخل تفاصيل المشروع لحساب التكلفة والوقت.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>اسم المشروع</Label>
                          <Input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="مثال: تصميم موقع" />
                        </div>
                        <div className="space-y-2">
                          <Label>سعر الساعة (اختياري)</Label>
                          <Input type="number" value={newProjectRate} onChange={e => setNewProjectRate(e.target.value)} placeholder="مثال: 50" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleAddProject}>إضافة</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}
            
            <div className="flex gap-2 pt-4 border-t">
              {!activeSession ? (
                <Button onClick={() => startSession(selectedProject === 'none' ? 'salary' : 'freelance', selectedProject === 'none' ? undefined : selectedProject)} size="lg" className="w-full gap-2">
                  <Play className="h-4 w-4" /> تسجيل الدخول
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="lg" className="flex-1 gap-2">
                    <Coffee className="h-4 w-4" /> استراحة
                  </Button>
                  <Button variant="destructive" onClick={() => endSession('انتهى العمل')} size="lg" className="flex-1 gap-2">
                    <Square className="h-4 w-4" /> تسجيل الخروج
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={smartMode === 'focus' ? 'border-primary bg-primary/5' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Focus className="h-5 w-5" /> وضع التركيز (Pomodoro)
            </CardTitle>
            <CardDescription>يغلق الإشعارات ويساعدك على التركيز العميق.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6 space-y-6">
            <div className="text-6xl font-bold font-mono tracking-tighter">
              {formatTimeLeft(focusTimeLeft)}
            </div>
            <div className="flex gap-4">
              <Button onClick={toggleFocusMode} variant={isFocusActive ? 'destructive' : 'default'} size="lg" className="w-32">
                {isFocusActive ? 'إيقاف' : 'بدء التركيز'}
              </Button>
              {!isFocusActive && focusTimeLeft !== 25 * 60 && (
                <Button onClick={() => setFocusTimeLeft(25 * 60)} variant="outline" size="lg">
                  إعادة ضبط
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
