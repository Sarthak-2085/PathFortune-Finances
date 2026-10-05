import React, { useState } from 'react';
import { X, Send, Sparkles, Bot, User, CheckCircle2, Lightbulb, WifiOff } from 'lucide-react';
import { askAIChat } from '../../services/api';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  contextUsed?: any;
  source?: 'gemini' | 'fallback';
  isError?: boolean;
  timestamp: string;
}

// Lightweight markdown rendering - **bold** and "• " bullet lines only.
// No new dependency, no new design system - just makes existing AI text
// (which already uses this markdown-lite syntax) actually render as such
// instead of showing literal asterisks.
const renderFormattedText = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    const isBullet = line.trim().startsWith('• ');
    const content = isBullet ? line.trim().slice(2) : line;
    const parts = content.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    const rendered = parts.map((part, idx) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={idx} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>
      ) : (
        <React.Fragment key={idx}>{part}</React.Fragment>
      )
    );
    return isBullet ? (
      <div key={lineIdx} className="flex space-x-1.5 pl-0.5">
        <span className="text-brand-500">•</span>
        <span>{rendered}</span>
      </div>
    ) : (
      <div key={lineIdx}>{rendered}</div>
    );
  });
};

export const ChatDrawer: React.FC<ChatDrawerProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: "Hello! I am **PathFortune AI**, your grounded AI CFO assistant. I have live access to your financial statements, monthly budgets, ML forecasts, anomalies and recommendations.\n\nAsk me anything about your revenue drivers, expense spikes, financial risks, or profit trends!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const sampleQuestions = [
    "Why did my profit margin decrease?",
    "Which categories are costing me the most?",
    "What are my biggest financial risks?",
    "What is my expected revenue next month?",
    "Summarize my financial performance",
    "What should I focus on this month?"
  ];

  const handleSend = async (questionText?: string) => {
    const query = questionText || input;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    if (!questionText) setInput('');
    setLoading(true);

    try {
      // Pass the last few turns along for conversational continuity - the
      // backend only uses this for tone, never as a source of financial
      // facts (those always come fresh from the grounded context).
      const history = updatedMessages.slice(-5).map(m => ({ sender: m.sender, text: m.text }));
      const res = await askAIChat(query, history);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: res.answer,
        contextUsed: res.grounded_context_used,
        source: res.source,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: "I couldn't reach the financial data service just now. Please try again in a moment.",
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animation-slide-in">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Ask PathFortune AI</h3>
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                Grounded Financial Context Active
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 custom-scrollbar">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex space-x-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                  <Bot size={15} />
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-slate-900 text-white rounded-tr-none'
                  : msg.isError
                    ? 'bg-rose-50 border border-rose-200 text-rose-700 shadow-xs rounded-tl-none'
                    : 'bg-white border border-slate-200/90 text-slate-800 shadow-xs rounded-tl-none'
              }`}>
                <div className="space-y-1">{renderFormattedText(msg.text)}</div>

                {/* Context / fallback-mode badge if AI */}
                {msg.sender === 'ai' && msg.contextUsed && !msg.isError && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center space-x-1 text-[10px] text-slate-500">
                    {msg.source === 'fallback' ? (
                      <>
                        <WifiOff size={12} className="text-amber-500" />
                        <span>Offline grounded mode - answered directly from your data (no live AI model)</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        <span>Verified against PathFortune Database (KPIs & Forecasts)</span>
                      </>
                    )}
                  </div>
                )}

                <div className={`text-[10px] mt-1.5 text-right ${msg.sender === 'user' ? 'text-slate-400' : 'text-slate-400'}`}>
                  {msg.timestamp}
                </div>
              </div>
              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs shrink-0 mt-0.5">
                  <User size={15} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 p-3 bg-white border border-slate-200 rounded-2xl w-fit text-xs text-slate-500">
              <Sparkles size={14} className="animate-spin text-brand-600" />
              <span>Analyzing financial models & transaction database...</span>
            </div>
          )}
        </div>

        {/* Suggested Questions */}
        <div className="p-3 bg-white border-t border-slate-100 overflow-x-auto flex space-x-2 scrollbar-none">
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-[11px] font-medium bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 px-3 py-1.5 rounded-full whitespace-nowrap border border-slate-200/60 transition-colors flex items-center space-x-1"
            >
              <Lightbulb size={12} className="text-brand-500" />
              <span>{q}</span>
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200">
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about revenue, expenses, risks, or forecasts..."
              className="flex-1 bg-transparent px-3 text-xs text-slate-800 focus:outline-none placeholder:text-slate-400"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="p-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
