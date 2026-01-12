
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { BoxParams, BoxType } from '../types';

interface Props {
  currentParams: BoxParams;
  onUpdateParams: (params: BoxParams) => void;
}

export const AIConsultant: React.FC<Props> = ({ currentParams, onUpdateParams }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: '您好！我是您的 PackCAD 智能顧問。請問您今天想設計什麼樣的包裝？（例如：我想設計一個裝手工肥皂的禮盒）' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    // 保存對話歷史到 localStorage
    localStorage.setItem('packcad_chat_history', JSON.stringify(messages.slice(-10)));
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Current Box Params: ${JSON.stringify(currentParams)}. 
                   User says: "${userMsg}". 
                   Chat History: ${JSON.stringify(messages.slice(-5))}`,
        config: {
          systemInstruction: `你是一位資深的包裝結構工程師。
          你的任務是透過「引導式對話」協助客戶決定紙盒參數。
          
          規則：
          1. 總是保持專業且親切的語氣。
          2. 如果用戶的需求不明確，主動詢問內容物的尺寸、重量或用途。
          3. 如果決定了新的參數，必須在回覆的最末尾加上一組 JSON，格式如下：
             [UPDATE_PARAMS:{"type":"MAILER","w":200,"d":100,"h":50}]
             盒型代碼只能是: MAILER, GLUE_BOTTOM, TUCK_END, TELESCOPE, DRAWER, BOOK_STYLE, HANDLE。
          4. 不要一次問太多問題，每次引導 1-2 個關鍵點。
          5. 記住用戶之前的偏好（如：提到過要環保、要裝重物）。`,
        },
      });

      const aiText = response.text || "抱歉，我現在無法思考，請稍後再試。";
      
      // 處理參數更新
      const match = aiText.match(/\[UPDATE_PARAMS:(.*?)\]/);
      if (match) {
        try {
          const newParams = JSON.parse(match[1]);
          onUpdateParams({ ...currentParams, ...newParams });
        } catch (e) {
          console.error("Failed to parse AI params", e);
        }
      }

      // 移除回覆中的 JSON 標籤再顯示給用戶
      const cleanText = aiText.replace(/\[UPDATE_PARAMS:.*?\]/g, '').trim();
      setMessages(prev => [...prev, { role: 'ai', text: cleanText }]);

    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "系統連線異常，請檢查網路環境。" }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-700">
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">AI 結構顧問</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
              m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200 border border-slate-700'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {isTyping && <div className="text-xs text-slate-500 animate-pulse italic">顧問正在思考結構中...</div>}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-slate-800">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="描述您的包裝需求..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-12"
          />
          <button 
            onClick={handleSend}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};
