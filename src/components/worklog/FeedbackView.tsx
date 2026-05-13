import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Bug, Lightbulb, AlertCircle, Heart, Send } from 'lucide-react';
import { useLanguage } from "@/contexts/LanguageContext";

export default function FeedbackView() {
    const { t, lang } = useLanguage();

    const CATEGORIES = [
      { id: 'bug', label: t('t_auto_262'), icon: <Bug size={18} /> },
      { id: 'suggestion', label: t('t_auto_263'), icon: <Lightbulb size={18} /> },
      { id: 'complaint', label: t('t_auto_264'), icon: <AlertCircle size={18} /> },
      { id: 'praise', label: t('t_auto_265'), icon: <Heart size={18} /> }
    ];

  const [cat, setCat] = useState('bug');
  const [msg, setMsg] = useState('');

  const WHATSAPP_NUMBER = '201009969653';

  const handleSend = () => {
    if (msg.length < 5) return alert(t('t_auto_266'));
    const categoryLabel = CATEGORIES.find(c => c.id === cat)?.label;
    const text = `📱 *Work Companion Feedback*\n📂 التصنيف: ${categoryLabel}\n📝 الرسالة:\n${msg}\n\n📅 التاريخ: ${new Date().toLocaleString('ar-EG')}`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in" dir="rtl">
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{t('t_auto_80')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('t_auto_267')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map(c => (
          <button 
            key={c.id} 
            onClick={() => setCat(c.id)} 
            className={`p-4 rounded-2xl border flex items-center justify-center gap-3 transition-colors ${cat === c.id ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border bg-card hover:bg-secondary/50'}`}
          >
             {c.icon}
             <span className="text-sm">{c.label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 relative">
        <textarea 
          value={msg} 
          onChange={e => setMsg(e.target.value)} 
          placeholder={t('t_auto_268')} 
          className="w-full p-4 h-40 rounded-2xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none transition-all" 
        />
        <div className="absolute left-4 bottom-4 text-xs font-medium text-muted-foreground">
          {msg.length} {t('t_auto_269')}
                          </div>
      </div>

      <Button onClick={handleSend} className="w-full py-6 rounded-2xl text-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
        <Send className="w-5 h-5 ml-1" /> {t('t_auto_270')}
                    </Button>
      
      <p className="text-xs text-center text-muted-foreground opacity-70">{t('t_auto_271')}</p>
    </div>
  );
}
