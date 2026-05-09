import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Palette, Moon, Sun, Zap, Heart, Calendar, Focus, Info } from 'lucide-react';
import { useLanguage } from "@/contexts/LanguageContext";

export default function ThemesModes() {
    const { t, lang } = useLanguage();
  const { theme, setTheme, smartMode, setSmartMode } = useTheme();

  const themes = [
    { id: 'light', name: t('t_auto_81'), icon: Sun, color: 'bg-slate-100' },
    { id: 'dark', name: t('t_auto_82'), icon: Moon, color: 'bg-slate-900' },
    { id: 'ocean', name: t('t_auto_125'), icon: Zap, color: 'bg-blue-500' },
    { id: 'midnight', name: t('t_auto_126'), icon: Moon, color: 'bg-indigo-950' },
    { id: 'forest', name: t('t_auto_127'), icon: Calendar, color: 'bg-emerald-600' },
    { id: 'sunset', name: t('t_auto_128'), icon: Sun, color: 'bg-orange-500' },
    { id: 'monochrome', name: t('t_auto_129'), icon: Palette, color: 'bg-gray-800' }
  ];

  const modes = [
    { id: 'focus', name: t('t_auto_130'), desc: t('t_auto_131'), icon: Focus },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Palette className="h-8 w-8 text-primary" /> {t('t_auto_132')}
                          </h2>
        <p className="text-muted-foreground">{t('t_auto_133')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('t_auto_134')}</CardTitle>
            <CardDescription>{t('t_auto_135')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
            <CardTitle>{t('t_auto_136')}</CardTitle>
            <CardDescription>{t('t_auto_137')}</CardDescription>
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
