import React, { createContext, useContext, useState } from 'react';
import { GoogleGenAI } from '@google/genai';

interface AICoreContextType {
  askAI: (prompt: string) => Promise<string>;
  isLoading: boolean;
  error: string | null;
}

const AICoreContext = createContext<AICoreContextType | undefined>(undefined);

export const AICoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const askAI = async (prompt: string): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key is missing.');
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: 'أنت مساعد ذكي للإنتاجية في تطبيق يسمى Life Companion (رفيق الحياة). وظيفتك هي إرشاد المستخدم لتحقيق التوازن بين العمل والحياة الشخصية، وتحليل أوقات عمله لتنبيهه عن أخطار الاحتراق الوظيفي. تواصل دائماً باللغة العربية بأسلوب ودود، مشجع، واحترافي. لا تستخدم مصطلحات تقنية معقدة. ركز على تقديم نصائح قابلة للتنفيذ.',
        }
      });
      
      return response.text || 'عذراً، لم أتمكن من توليد رد.';
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء الاتصال بالمحرك الذكي.');
      return 'حدث خطأ. يرجى المحاولة لاحقاً.';
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
