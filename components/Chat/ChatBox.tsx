import React, { useRef, useEffect } from 'react';
import { Message } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User as UserIcon, Loader2, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatBoxProps {
  messages: Message[];
  loading: boolean;
  onSendMessage: (msg: string) => void;
  onSaveSnippet: (msg: string) => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ messages, loading, onSendMessage, onSaveSnippet }) => {
  const [input, setInput] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSendMessage(input);
    setInput('');
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full glass-panel rounded-xl overflow-hidden relative">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-white/30 text-center">
            <Bot className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">Select a mode and ask CodeBuddy!</p>
          </div>
        )}
        
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'assistant' 
                  ? 'bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-[0_0_15px_rgba(6,182,212,0.5)]' 
                  : 'bg-white/10'
              }`}>
                {msg.role === 'assistant' ? <Bot size={20} /> : <UserIcon size={20} />}
              </div>

              <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed relative group ${
                  msg.role === 'user' 
                    ? 'bg-white/10 text-white rounded-tr-none' 
                    : 'bg-black/40 border border-white/10 text-gray-200 rounded-tl-none'
                }`}>
                  {msg.role === 'assistant' ? (
                     <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown 
                            components={{
                                code(props) {
                                    const {children, className, node, ...rest} = props
                                    const match = /language-(\w+)/.exec(className || '')
                                    return match ? (
                                        <code className={`${className} block bg-black/50 p-2 rounded border border-white/10 my-2 overflow-x-auto`} {...rest}>
                                            {children}
                                        </code>
                                    ) : (
                                        <code className="bg-white/10 px-1 py-0.5 rounded text-cyan-300 font-mono text-xs" {...rest}>
                                            {children}
                                        </code>
                                    )
                                }
                            }}
                        >
                            {msg.content}
                        </ReactMarkdown>
                     </div>
                  ) : (
                    msg.content
                  )}
                  
                  {msg.role === 'assistant' && (
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className="p-1 hover:bg-white/10 rounded"
                            title="Copy to clipboard"
                          >
                             {copiedId === msg.id ? <Check size={14} className="text-green-400"/> : <Copy size={14} />}
                          </button>
                        <button 
                            onClick={() => onSaveSnippet(msg.content)} 
                            className="p-1 hover:bg-white/10 rounded" 
                            title="Save as snippet"
                        >
                            <span className="text-[10px] font-bold border border-white/30 px-1 rounded">SAVE</span>
                        </button>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-white/20 mt-1 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-4"
          >
             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center shrink-0">
                <Bot size={20} />
            </div>
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 p-4 rounded-2xl rounded-tl-none">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span className="text-sm text-gray-400">CodeBuddy is thinking...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-black/40 border-t border-white/10">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question or describe an error..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all placeholder:text-white/20"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-cyan-500/10 text-cyan-400 rounded-lg hover:bg-cyan-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Bot size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};