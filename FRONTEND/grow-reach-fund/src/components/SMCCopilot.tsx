import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Bot, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { API_BASE_URL } from "@/integrations/django/client";

interface Message {
  id: string;
  sender: 'ai' | 'user' | 'system';
  content: string;
  status?: 'processing';
}

export function SMCCopilot({ embedded = false }: { embedded?: boolean }) {
  const { role, isAuthenticated, user } = useAuth();
  const [isOpen, setIsOpen] = useState(embedded);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, prevX: 0, prevY: 0 });

  const handleDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only process left click
    const target = e.target as HTMLElement;
    if (target.closest('button')) return; // Ignore buttons in the header

    e.preventDefault();
    setIsDragging(true);

    const rect = document.getElementById('smc-copilot-window')?.getBoundingClientRect();
    const startLeft = hasMoved ? position.x : (rect?.left || 0);
    const startTop = hasMoved ? position.y : (rect?.top || 0);

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      prevX: startLeft,
      prevY: startTop
    };

    if (!hasMoved) {
      setPosition({ x: startLeft, y: startTop });
      setHasMoved(true);
    }
  };

  useEffect(() => {
    const handleDragMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      
      setPosition({
        x: dragRef.current.prevX + dx,
        y: dragRef.current.prevY + dy
      });
    };

    const handleDragEnd = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    }
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging]);

  useEffect(() => {
    if (!isAuthenticated || !isOpen) return;

    const wsUrl = API_BASE_URL.replace(/^https?/, (match) => match === 'https' ? 'wss' : 'ws').replace(/\/api\/?$/, '/ws/ai/chat/');
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Connected to SMC Copilot WS');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'system') {
          setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'system', content: data.message }]);
        } else if (data.type === 'typing') {
           // We could show a typing indicator
           setMessages(prev => {
             const exist = prev.find(m => m.id === 'typing');
             if (exist) return prev;
             return [...prev, { id: 'typing', sender: 'ai', content: '...', status: 'processing' }];
           });
        } else if (data.type === 'message' || data.sender === 'ai') {
          setMessages(prev => {
            // Remove typing indicator
            const filtered = prev.filter(m => m.id !== 'typing');
            return [...filtered, { id: Date.now().toString(), sender: 'ai', content: data.message }];
          });
        } else if (data.type === 'error') {
          setMessages(prev => {
            const filtered = prev.filter(m => m.id !== 'typing');
            return [...filtered, { id: Date.now().toString(), sender: 'system', content: `❌ ${data.message}` }];
          });
        }
      } catch (e) {
         console.error('Invalid WS message', e);
      }
    };

    ws.onclose = () => console.log('SMC Copilot WS disconnected');
    
    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [isAuthenticated, isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  if (!isAuthenticated) return null;
  
  // Hide global floating copilot for farmers, since they get it embedded in their dashboard
  if (!embedded && role === 'farmer') return null;

  const sendMessage = (text?: string) => {
    const contentToSend = typeof text === 'string' ? text : inputValue;
    if (!contentToSend.trim() || !socket || socket.readyState !== WebSocket.OPEN) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: contentToSend
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    socket.send(JSON.stringify({
      message: contentToSend,
      role: role || 'farmer',
      first_name: user?.first_name || user?.username || 'Farmer',
      user_id: user?.id
    }));

    if (typeof text !== 'string') setInputValue("");
  };

  const parseContent = (content: string) => {
    // Basic markdown parsing for line breaks and bold
    return content.split('\n').map((line, i) => (
      <span key={i}>
        {line.split('**').map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
        <br />
      </span>
    ));
  };

  return (
    <>
      {/* Floating Action Button */}
      {!embedded && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl bg-primary text-white hover:bg-primary/90 transition-all z-50 transform hover:scale-110 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
        >
          <MessageCircle size={28} />
        </button>
      )}

      {/* Chat Window */}
      <div 
        id="smc-copilot-window"
        className={
          embedded 
            ? "w-full h-full min-h-[500px] flex flex-col bg-card rounded-2xl shadow-soft border border-border"
            : `fixed ${!hasMoved ? 'bottom-6 right-6 origin-bottom-right' : ''} w-[380px] h-[600px] max-h-[80vh] flex flex-col bg-card rounded-2xl shadow-2xl border border-border z-50 ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'} ${isDragging ? '' : 'transition-all duration-300'}`
        }
        style={(!embedded && hasMoved) ? { left: `${position.x}px`, top: `${position.y}px` } : {}}
      >
        {/* Header */}
        <div 
          className={`flex items-center justify-between p-4 bg-primary text-primary-foreground ${embedded ? 'rounded-t-2xl' : 'rounded-t-2xl ' + (isDragging ? 'cursor-grabbing' : 'cursor-grab')} select-none`}
          onMouseDown={!embedded ? handleDragStart : undefined}
        >
          <div className="flex items-center gap-2 pointer-events-none">
            <Bot size={24} />
            <h3 className="font-semibold text-lg">SMC Copilot</h3>
          </div>
          {!embedded && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
              className="p-1 hover:bg-white/20 rounded-full transition-colors z-10"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Messages Layout */}
        <div 
          ref={scrollRef}
          className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 bg-muted/30 scroll-smooth"
        >
          {messages.length === 0 && (
             <div className="flex flex-col items-center justify-center h-full p-4 mt-8 text-center bg-transparent">
               <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 animate-bounce shrink-0">
                 <Bot size={32} className="text-primary" />
               </div>
               <h3 className="font-bold text-lg text-foreground mb-1">Hi, {user?.username}!</h3>
               <p className="text-sm text-muted-foreground mb-6">Need help? Try asking one of these to get started:</p>
               
               <div className="flex flex-col gap-2 w-full max-w-[90%]">
                 {(role === 'farmer' 
                    ? ['What are the current maize prices?', 'What is the weather forecast today?', 'Give me farming tips.']
                    : role === 'buyer'
                    ? ['Find fresh tomatoes near me', 'Show the cheapest maize listings.', 'How do I complete a transaction?']
                    : role === 'creditor'
                    ? ['Analyze the latest credit applicant data.', 'What is the default risk in Nairobi?']
                    : ['Analyze system transaction volume.', 'Detect market anomalies.']
                 ).map((suggestion, idx) => (
                   <button 
                     key={idx} 
                     onClick={() => sendMessage(suggestion)}
                     className="bg-card border border-border border-primary/20 hover:bg-primary/5 hover:border-primary/50 text-sm py-2 px-3 rounded-xl shadow-sm text-left transition-all active:scale-95 text-foreground truncate"
                   >
                     {suggestion}
                   </button>
                 ))}
               </div>
             </div>
          )}

          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary'}`}>
                {msg.sender === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
              </div>
              
              <div 
                className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm shadow-sm
                  ${msg.sender === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                    : 'bg-background border border-border rounded-tl-sm'
                  }
                  ${msg.status === 'processing' ? 'animate-pulse' : ''}
                `}
              >
                {msg.status === 'processing' ? (
                  <span className="flex gap-1 items-center h-5">
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-75"></span>
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-150"></span>
                  </span>
                ) : (
                  parseContent(msg.content)
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-background border-t border-border rounded-b-2xl">
          <form 
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            className="flex items-center gap-2"
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 rounded-full bg-muted border-transparent focus-visible:ring-primary"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!inputValue.trim()}
              className="rounded-full shrink-0 shadow-md transition-transform active:scale-95"
            >
              <Send size={18} />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
