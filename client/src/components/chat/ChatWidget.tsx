import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { MessageCircle, X, Send, User, Bot, Sparkles, FileText, ChevronDown, RotateCcw } from 'lucide-react';

interface ChatMessage {
  _id?: string;
  sender: 'CUSTOMER' | 'AI' | 'EXECUTIVE' | 'SYSTEM';
  message: string;
  messageType: 'TEXT' | 'PROPOSAL' | 'NOTIFICATION' | 'SUMMARY' | 'ACTION';
  metadata?: Record<string, any>;
  timestamp: string;
}

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [takeoverStatus, setTakeoverStatus] = useState({ isTakeoverActive: false, executiveId: '' });

  const socketRef = useRef<Socket | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize Session ID
  useEffect(() => {
    let savedSessionId = localStorage.getItem('asep_session_id');
    if (!savedSessionId) {
      savedSessionId = `sess_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('asep_session_id', savedSessionId);
    }
    setSessionId(savedSessionId);
  }, []);

  // Connect to Sockets when Session ID is ready
  useEffect(() => {
    if (!sessionId) return;

    const serverUrl = import.meta.env.VITE_API_URL;
    // The public Vercel demo can be explored without a separately deployed API.
    // Connect only when an API endpoint is explicitly configured.
    if (!serverUrl) return;
    const socket = io(serverUrl, {
      withCredentials: true
    });
    socketRef.current = socket;

    // Join room
    socket.emit('session:join', sessionId);

    // Listeners
    socket.on('chat:message', (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
      setIsTyping(false);
    });

    socket.on('chat:typing', ({ isTyping, sender }) => {
      if (sender === 'AI') {
        setIsTyping(isTyping);
      }
    });

    socket.on('executive:takeover_status', (status) => {
      setTakeoverStatus(status);
    });

    // Load message history via REST API
    fetch(`${serverUrl}/api/v1/leads/sessions/${sessionId}`)
      .then((res) => {
        if (res.ok) return res.json();
        // If session not found, create one
        return fetch(`${serverUrl}/api/v1/leads/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'website', sessionId })
        }).then((r) => r.json());
      })
      .then((data) => {
        if (data && data.messages) {
          setMessages(data.messages);
        }
      })
      .catch((err) => console.error('[ChatWidget] History load error:', err));

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  // Scroll to bottom
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleResetChat = () => {
    if (window.confirm('Are you sure you want to start a new conversation? This will clear your chat history.')) {
      const newSessionId = `sess_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('asep_session_id', newSessionId);
      setSessionId(newSessionId);
      setMessages([]);
      setTakeoverStatus({ isTakeoverActive: false, executiveId: '' });
      setIsTyping(false);
    }
  };

  const handleSendMessage = (text = inputMessage) => {
    if (!text.trim()) return;

    const msgPayload: ChatMessage & { sessionId: string } = {
      sessionId,
      sender: 'CUSTOMER',
      message: text,
      messageType: 'TEXT' as const,
      timestamp: new Date().toISOString()
    };

    if (socketRef.current) {
      socketRef.current.emit('chat:message', msgPayload);
    } else {
      setMessages((previous) => [...previous, msgPayload, {
        sender: 'AI',
        message: 'Thanks — I’ve captured that. Connect an API endpoint to continue with live qualification and a tailored brief.',
        messageType: 'TEXT',
        timestamp: new Date().toISOString()
      }]);
    }

    setInputMessage('');
  };

  const handleQuickAction = (actionText: string) => {
    handleSendMessage(actionText);
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Button */}
      {!isOpen && (
        <button
          aria-label="Open chat"
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-primary-dark transition-all duration-300 transform hover:scale-105 active:scale-95"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Expanded Chat Widget */}
      {isOpen && (
        <div className="h-[min(550px,calc(100vh-3rem))] w-[min(380px,calc(100vw-2rem))] rounded-xl border border-[#5a4a99] bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
          {/* Header */}
          <div className="bg-primary p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center relative">
                {takeoverStatus.isTakeoverActive ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                <span className="w-3 h-3 bg-success border-2 border-primary rounded-full absolute bottom-0 right-0"></span>
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight">
                  {takeoverStatus.isTakeoverActive ? 'Human Consultant' : 'AI Sales Assistant'}
                </h3>
                <span className="text-[11px] text-blue-200">
                  {takeoverStatus.isTakeoverActive ? 'Live Handoff Active' : 'Online • Custom Solutions'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleResetChat} className="hover:bg-white/10 p-1.5 rounded-full transition-colors" title="New Conversation">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1.5 rounded-full transition-colors">
                <ChevronDown className="w-4 h-4" />
              </button>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1.5 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.length === 0 && (
              <div className="text-center py-8 px-4 text-slate-400 space-y-2">
                <Sparkles className="w-8 h-8 text-primary/30 mx-auto mb-2" />
                <p className="text-sm font-semibold">How can we help your business today?</p>
                <p className="text-xs">I can guide you through our core services, build custom project estimates, and prepare proposal specs.</p>
              </div>
            )}

            {messages.map((msg, index) => {
              const isCustomer = msg.sender === 'CUSTOMER';
              const isSystem = msg.sender === 'SYSTEM';

              if (isSystem) {
                return (
                  <div key={index} className="text-center">
                    <span className="inline-block text-[11px] font-medium bg-slate-200/60 text-slate-600 px-3 py-1 rounded-full border border-slate-100">
                      {msg.message}
                    </span>
                  </div>
                );
              }

              return (
                <div key={index} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                  {!isCustomer && (
                    <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-xs text-primary font-bold">
                      {msg.sender === 'AI' ? 'AI' : 'HC'}
                    </div>
                  )}
                  <div className="max-w-[75%] space-y-1">
                    <div
                      className={`p-3 rounded-2xl text-sm ${
                        isCustomer
                          ? 'bg-primary text-white rounded-br-none shadow-md'
                          : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none shadow-sm'
                      }`}
                    >
                      {/* Standard text */}
                      <p className="whitespace-pre-line leading-relaxed">{msg.message}</p>

                      {/* Dynamic card for Proposal */}
                      {msg.messageType === 'PROPOSAL' && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                          <FileText className="w-8 h-8 text-blue-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">Technical Proposal Specs</p>
                            <span className="text-[10px] text-slate-400">PDF Document</span>
                          </div>
                          <a
                            href={msg.metadata?.pdfUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-primary hover:bg-primary-dark text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                          >
                            Open
                          </a>
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 block text-right px-1">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex justify-start items-end gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-xs text-primary font-bold">
                  AI
                </div>
                <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
            <div ref={messageEndRef} />
          </div>

          {/* Quick Actions / Suggestions */}
          {!takeoverStatus.isTakeoverActive && (
            <div className="p-2 border-t border-slate-100 flex gap-2 overflow-x-auto bg-white whitespace-nowrap scrollbar-none">
              <button
                onClick={() => handleQuickAction('I need a website for my business')}
                className="bg-slate-100 hover:bg-slate-200 text-[11px] font-medium text-slate-600 px-3 py-1.5 rounded-full transition-colors inline-block"
              >
                🕸️ Need website
              </button>
              <button
                onClick={() => handleQuickAction('How much does standard software cost?')}
                className="bg-slate-100 hover:bg-slate-200 text-[11px] font-medium text-slate-600 px-3 py-1.5 rounded-full transition-colors inline-block"
              >
                💰 Cost estimates
              </button>
              <button
                onClick={() => handleQuickAction('I want to schedule a kick-off meeting')}
                className="bg-slate-100 hover:bg-slate-200 text-[11px] font-medium text-slate-600 px-3 py-1.5 rounded-full transition-colors inline-block"
              >
                📅 Book meeting
              </button>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask a question or explain requirements..."
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors bg-slate-50/50"
            />
            <button
              onClick={() => handleSendMessage()}
              className="bg-primary hover:bg-primary-dark text-white p-2.5 rounded-xl shadow-md transition-all duration-300 active:scale-95 flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default ChatWidget;
