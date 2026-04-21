import React, { createContext, useContext, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useWorkLog } from './WorkLogContext';

interface AICoreContextType {
  askAI: (prompt: string, systemInstructionOverride?: string, responseSchema?: any) => Promise<string>;
  isLoading: boolean;
  error: string | null;
}

const AICoreContext = createContext<AICoreContextType | undefined>(undefined);

export const AICoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Safe extraction of settings within Provider, handling possible initialization order
  const getSettingsSafely = () => {
    try {
      // Direct local storage read just to be totally safe if context is not fully ready
      const stored = localStorage.getItem('lifecompanion_settings');
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return null;
  };

  const askAI = async (prompt: string, systemInstructionOverride?: string, responseSchema?: any): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const dbSettings = getSettingsSafely();
      const apiKey = dbSettings?.customAIApiKey;
      
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('رجاء إدخال مفتاح API الخاص بك في الإعدادات');
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: systemInstructionOverride || 'أنت مساعد ذكي للإنتاجية في تطبيق يسمى Life Companion (رفيق الحياة). وظيفتك هي إرشاد المستخدم لتحقيق التوازن بين العمل والحياة الشخصية، وتحليل أوقات عمله لتنبيهه عن أخطار الاحتراق الوظيفي. تواصل دائماً باللغة العربية بأسلوب ودود، مشجع، واحترافي. لا تستخدم مصطلحات تقنية معقدة. ركز على تقديم نصائح قابلة للتنفيذ.',
          responseMimeType: responseSchema ? 'application/json' : 'text/plain',
          responseSchema: responseSchema,
        }
      });
      
      return response.text || 'عذراً، لم أتمكن من توليد رد.';
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء الاتصال بالمحرك الذكي.');
      throw err; // Re-throw so callers can handle it
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AICoreContext.Provider value={{ askAI, isLoading, error }}>
      {children}
    </AICoreContext.Provider>
  );
};

export const useAICore = () => {
  const context = useContext(AICoreContext);
  if (context === undefined) {
    throw new Error('useAICore must be used within an AICoreProvider');
  }
  return context;
};
