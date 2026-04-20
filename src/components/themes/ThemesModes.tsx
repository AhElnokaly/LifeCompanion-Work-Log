import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Palette, Moon, Sun, Zap, Heart, Calendar, Focus } from 'lucide-react';

export default function ThemesModes() {
  const { theme, setTheme, smartMode, setSmartMode } = useTheme();

  const themes = [
    { id: 'dynamic', name: 'تلقائي', icon: Sun, color: 'bg-gradient-to-r from-blue-400 to-indigo-500' },
    { id: 'light', name: 'فاتح', icon: Sun, color: 'bg-slate-100' },
    { id: 'dark', name: 'داكن', icon: Moon, color: 'bg-slate-900' },
    { id: 'bold', name: 'جريء', icon: Zap, color: 'bg-orange-500' },
    { id: 'pink', name: 'وردي', icon: Heart, color: 'bg-pink-500' },
    { id: 'metallic', name: 'معدني', icon: Palette, color: 'bg-slate-400' },
    { id: 'sand', name: 'رملي', icon: Palette, color: 'bg-amber-100' },
    { id: 'ramadan-night', name: 'ليالي رمضان', icon: Moon, color: 'bg-indigo-900 border-yellow-500' },
    { id: 'desert', name: 'الصحراء', icon: Sun, color: 'bg-[#fdf6e3] border-orange-500' },
  ];

  const modes = [
    { id: 'natural', name: 'الوضع الطبيعي', desc: 'يتغير مع فصول السنة', icon: Sun },
    { id: 'ramadan', name: 'وضع رمضان', desc: 'ألوان ليلية وذهبية', icon: Moon },
    { id: 'focus', name: 'وضع التركيز', desc: 'أبيض وأسود بدون مشتتات', icon: Focus },
    { id: 'emotional', name: 'الوضع العاطفي', desc: 'يتفاعل مع مزاجك', icon: Heart },
    { id: 'friday', name: 'وضع الجمعة', desc: 'أخضر إسلامي مميز', icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Palette className="h-8 w-8 text-primary" /> الثيمات والأوضاع
        </h2>
        <p className="text-muted-foreground">تغيير شخصية التطبيق بالكامل حسب مزاجك أو وقتك.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>الثيمات الأساسية</CardTitle>
            <CardDescription>اختر الألوان التي تناسب ذوقك.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {themes.map((t) => {
                const Icon = t.icon;
                return (
                  <Button
                    key={t.id}
                    variant={theme === t.id ? 'default' : 'outline'}
                    className={`h-24 flex flex-col gap-2 ${theme === t.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    onClick={() => setTheme(t.id as any)}
                  >
                    <div className={`w-8 h-8 rounded-full ${t.color} flex items-center justify-center border shadow-sm`}>
                      <Icon className={`h-4 w-4 ${t.id === 'dark' ? 'text-white' : 'text-black/70'}`} />
                    </div>
                    {t.name}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>الأوضاع الذكية (Modes)</CardTitle>
            <CardDescription>أوضاع تغير تجربة الاستخدام بالكامل.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {modes.map((m) => {
                const Icon = m.icon;
                const isActive = smartMode === m.id;
                return (
                  <div 
                    key={m.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${isActive ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`}
                    onClick={() => setSmartMode(isActive ? null : m.id as any)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-md ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.desc}</p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border ${isActive ? 'bg-primary border-primary' : 'border-muted-foreground'}`} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
