import React, { useState, useRef, useEffect } from 'react';
import { useAICore } from '../../contexts/AICoreContext';
import { useWorkLog } from '../../contexts/WorkLogContext';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Brain, Send, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function EmbeddedAIChat() {
  const { askAI } = useAICore();
  const { sessions, settings } = useWorkLog(); // Pass real context
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: 'أهلاً بك! أنا مساعدك الذكي الخاص بـ LifeCompanion المدمج في واجهتك. كيف يمكنني إفادتك اليوم؟ 🧠' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!prompt.trim()) return;

    const userMessage = prompt;
    setPrompt('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      import('../../lib/analytics').then(async ({ getStats }) => {
        const stats = getStats(sessions, settings);
        const augmentedPrompt = `[Context Data: Burnout Score: ${stats.burnout}%, Streak: ${stats.streak} days, Monthly Hours: ${stats.hoursMonth.toFixed(1)}, Monthly Overtime: ${stats.otMonth.toFixed(1)}]\n\nUser Question: ${userMessage}`;
        
        try {
            const response = await askAI(augmentedPrompt);
            setMessages(prev => [...prev, { role: 'ai', text: response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', text: 'حدث خطأ غير متوقع. يرجى التحقق من مفتاح Gemini API أو الاتصال بالإنترنت.' }]);
        } finally {
            setIsLoading(false);
        }
      });
    } catch (e) {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative" dir="rtl">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 pb-20">
          {messages.map((msg, index) => (
            <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div 
                className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-none' 
                    : 'bg-secondary rounded-tl-none border border-white/5 shadow-sm'
                }`}
              >
                {msg.role === 'ai' ? (
                  <div className="markdown-body">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex flex-col items-start">
              <div className="max-w-[80%] rounded-xl p-3 bg-secondary animate-pulse rounded-tl-none text-sm flex items-center gap-2">
                <Bot className="h-4 w-4 animate-spin text-primary" /> يحلل ويفكر...
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
      <div className="p-3 bg-card border-t shrink-0 absolute bottom-0 left-0 right-0">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex w-full gap-2">
          <Input 
            placeholder="اسأل رفيق الحياة..." 
            value={prompt} 
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            className="bg-background rounded-full border-white/10 h-14 shadow-sm"
          />
          <Button type="submit" disabled={isLoading || !prompt.trim()} className="h-14 w-14 rounded-full shadow-md shrink-0">
            <Send className="h-5 w-5 rtl:-scale-x-100" />
          </Button>
        </form>
      </div>
    </div>
  );
}
