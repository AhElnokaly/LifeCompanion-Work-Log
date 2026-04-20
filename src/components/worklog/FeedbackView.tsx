import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Bug, Lightbulb, AlertCircle, Heart, Send } from 'lucide-react';

const CATEGORIES = [
  { id: 'bug', label: 'بلاغ خطأ', icon: <Bug size={18} /> },
  { id: 'suggestion', label: 'اقتراح', icon: <Lightbulb size={18} /> },
  { id: 'complaint', label: 'شكوى', icon: <AlertCircle size={18} /> },
  { id: 'praise', label: 'إشادة', icon: <Heart size={18} /> }
];

export default function FeedbackView() {
  const [cat, setCat] = useState('bug');
  const [msg, setMsg] = useState('');

  const WHATSAPP_NUMBER = '201009969653';

  const handleSend = () => {
    if (msg.length < 5) return alert('الرسالة قصيرة جداً');
    const categoryLabel = CATEGORIES.find(c => c.id === cat)?.label;
    const text = `📱 *LifeCompanion Feedback*\n📂 التصنيف: ${categoryLabel}\n📝 الرسالة:\n${msg}\n\n📅 التاريخ: ${new Date().toLocaleString('ar-EG')}`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in" dir="rtl">
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">الشكاوى والمقترحات</h2>
        <p className="text-sm text-muted-foreground mt-1">نسعد بسماع رأيك أو مساعدتك لتطوير التطبيق معاً</p>
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
          placeholder="اكتب رسالتك تفصيلياً هنا..." 
          className="w-full p-4 h-40 rounded-2xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none transition-all" 
        />
        <div className="absolute left-4 bottom-4 text-xs font-medium text-muted-foreground">
          {msg.length} حرف
        </div>
      </div>

      <Button onClick={handleSend} className="w-full py-6 rounded-2xl text-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
        <Send className="w-5 h-5 ml-1" /> إرسال عبر واتساب
      </Button>
      
      <p className="text-xs text-center text-muted-foreground opacity-70">سيتم فتح تطبيق واتساب مباشرة لتحويل رسالتك بأمان.</p>
    </div>
  );
}
