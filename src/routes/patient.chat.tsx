import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { Send, Bot, User as UserIcon } from 'lucide-react';

export const Route = createFileRoute('/patient/chat')({
  component: PatientChat,
});

function PatientChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id) {
      fetchHistory();
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/chat/history/${user?.id}`, {
        headers: {
          'X-User-ID': String(user?.id),
          'X-User-Role': 'patient'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch chat history', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user?.id) return;

    const newMsg = { sender: 'patient', message: input, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': String(user.id),
          'X-User-Role': 'patient'
        },
        body: JSON.stringify({ patient_id: user.id, message: newMsg.message }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { sender: 'bot', message: data.reply, timestamp: new Date().toISOString() }]);
      }
    } catch (error) {
      console.error('Failed to send message', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 p-4 text-white flex items-center gap-3">
        <Bot size={28} />
        <div>
          <h2 className="text-xl font-bold">المساعد الطبي HemoCare</h2>
          <p className="text-red-100 text-sm">متواجد للإجابة على أسئلتك ومتابعة أدويتك</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
            <Bot size={48} className="text-gray-400" />
            <p className="text-lg text-center">أهلاً بك! يمكنك سؤالي عن أدويتك أو أي استفسارات طبية.</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.sender === 'patient' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-2xl p-4 flex gap-3 ${
              msg.sender === 'patient' 
                ? 'bg-red-600 text-white rounded-tr-none' 
                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-sm rounded-tl-none'
            }`}>
              {msg.sender === 'bot' && <Bot size={20} className="mt-1 flex-shrink-0 text-red-600" />}
              <div className="whitespace-pre-wrap leading-relaxed">{msg.message}</div>
              {msg.sender === 'patient' && <UserIcon size={20} className="mt-1 flex-shrink-0 opacity-80" />}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-none p-4 shadow-sm flex gap-2 items-center">
              <Bot size={20} className="text-red-600" />
              <div className="flex space-x-1 space-x-reverse">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب رسالتك هنا..."
            className="w-full bg-gray-100 dark:bg-gray-900 border-none rounded-full py-3 pr-6 pl-14 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-red-500 focus:outline-none"
            dir="rtl"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute left-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} className="transform rotate-180" />
          </button>
        </div>
      </form>
    </div>
  );
}
