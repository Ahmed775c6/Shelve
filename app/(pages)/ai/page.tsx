'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Send, Sparkles, Book, MessageSquare } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AskPage() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ id: string; title: string; date: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin');
    }

    // Add initial welcome message
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hello! I can summarize books, explain themes, answer questions, or give you personalized recommendations. What would you like to explore today?`,
        timestamp: new Date(),
      },
    ]);

    // Mock chat history
    setChatHistory([
      { id: '1', title: 'Summarize: 1984', date: 'Jun 20' },
      { id: '2', title: 'Themes in NOTW', date: 'Jun 18' },
      { id: '3', title: 'Book recs for sci-fi fans', date: 'Jun 15' },
    ]);
  }, [status]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (status === 'loading') {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-[#9b9890]">Loading chat...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, history: messages }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I'm having trouble responding right now. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble responding right now. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetClick = (preset: string) => {
    setInput(preset);
    // Auto-send after a short delay
    setTimeout(() => handleSend(), 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessage = (content: string) => {
    return content.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        {i < content.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <div className="p-8 flex flex-col h-[calc(100vh-52px)]">
      <div className="mb-5">
        <h1 className="font-serif text-2xl text-[#f0ede8] mb-1">Ask about a book</h1>
        <p className="text-sm text-[#9b9890]">
          Summarize, analyze, discuss, or get spoiler-free questions answered
        </p>
      </div>

      <div className="flex-1 grid grid-cols-[220px_1fr] gap-5 min-h-0">
        {/* Chat Sidebar */}
        <div className="border-r border-[rgba(255,255,255,0.07)] pr-5 overflow-y-auto">
          <button
            onClick={() => {
              setMessages([
                {
                  id: 'welcome',
                  role: 'assistant',
                  content: 'Hello! I can summarize books, explain themes, answer questions, or give you personalized recommendations. What would you like to explore today?',
                  timestamp: new Date(),
                },
              ]);
            }}
            className="w-full py-2 bg-[#222119] border border-[rgba(255,255,255,0.07)] rounded-lg text-sm text-[#9b9890] hover:text-[#f0ede8] hover:border-[rgba(255,255,255,0.12)] transition-colors mb-3 flex items-center justify-center gap-1.5"
          >
            <Sparkles size={14} />
            New chat
          </button>

          <div className="text-[10px] text-[#5c5a56] uppercase tracking-wider mb-2">Recent chats</div>
          {chatHistory.map((chat) => (
            <div
              key={chat.id}
              className="p-2.5 rounded-lg cursor-pointer hover:bg-[#1a1916] transition-colors mb-1"
              onClick={() => {
                // Load chat history (mock)
                setMessages([
                  {
                    id: 'history1',
                    role: 'assistant',
                    content: `This is a mock conversation from your chat history: "${chat.title}"`,
                    timestamp: new Date(),
                  },
                  {
                    id: 'history2',
                    role: 'user',
                    content: `Tell me more about ${chat.title}`,
                    timestamp: new Date(),
                  },
                ]);
              }}
            >
              <div className="text-xs text-[#f0ede8] mb-0.5">{chat.title}</div>
              <div className="text-[10px] text-[#5c5a56]">{chat.date}</div>
            </div>
          ))}
        </div>

        {/* Chat Main */}
        <div className="flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto pb-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium ${
                    message.role === 'assistant'
                      ? 'bg-[rgba(201,169,110,0.1)] text-[#c9a96e] border border-[rgba(201,169,110,0.25)]'
                      : 'bg-[#222119] text-[#9b9890] border border-[rgba(255,255,255,0.07)]'
                  }`}
                >
                  {message.role === 'assistant' ? '✦' : 'R'}
                </div>
                <div
                  className={`max-w-[480px] rounded-lg p-3 text-sm leading-relaxed ${
                    message.role === 'assistant'
                      ? 'bg-[#1a1916] border border-[rgba(255,255,255,0.07)] text-[#9b9890]'
                      : 'bg-[#222119] border border-[rgba(255,255,255,0.07)] text-[#f0ede8]'
                  }`}
                >
                  {formatMessage(message.content)}

                  {/* Preset chips for welcome message */}
                  {message.id === 'welcome' && (
                    <div className="flex gap-1.5 flex-wrap mt-2.5">
                      {[
                        'Summarize The Name of the Wind',
                        'What are the main themes in 1984?',
                        'Recommend books similar to Dune',
                      ].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => handlePresetClick(preset)}
                          className="px-2.5 py-1 bg-[#222119] border border-[rgba(255,255,255,0.07)] rounded-full text-[10px] text-[#9b9890] hover:text-[#f0ede8] hover:border-[rgba(255,255,255,0.12)] transition-colors"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-[rgba(201,169,110,0.1)] text-[#c9a96e] border border-[rgba(201,169,110,0.25)] text-xs font-medium">
                  ✦
                </div>
                <div className="max-w-[480px] rounded-lg p-3 bg-[#1a1916] border border-[rgba(255,255,255,0.07)] text-[#9b9890] text-sm">
                  <div className="flex gap-1">
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse delay-100">●</span>
                    <span className="animate-pulse delay-200">●</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="border-t border-[rgba(255,255,255,0.07)] pt-3 mt-auto">
            <div className="flex gap-2.5">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your books…"
                rows={1}
                className="flex-1 bg-[#1a1916] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2.5 text-sm text-[#f0ede8] placeholder:text-[#5c5a56] focus:border-[#c9a96e] outline-none transition-colors resize-none min-h-[40px] max-h-[120px]"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="w-10 h-10 bg-[#c9a96e] text-[#1a1510] rounded-lg flex items-center justify-center hover:bg-[#d4b47a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}