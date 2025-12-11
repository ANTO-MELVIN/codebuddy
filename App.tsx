import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Code2, 
  Terminal, 
  Zap, 
  FileText, 
  LogOut, 
  LayoutDashboard, 
  MessageSquare, 
  Bookmark, 
  Github,
  Moon,
  Box,
  ArrowLeft
} from 'lucide-react';
import { TiltCard } from './components/UI/TiltCard';
import { NeonButton } from './components/UI/NeonButton';
import { CodeEditor } from './components/Editor/CodeEditor';
import { ChatBox } from './components/Chat/ChatBox';
import { Login } from './components/Auth/Login';
import { sendMessageToGemini } from './services/geminiService';
import { auth, logout, saveUserChats, getUserChats, saveUserSnippets, getUserSnippets, saveUserContext, getUserContext, checkRedirectResult } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ChatSession, Message, Mode, Snippet, LANGUAGES, User } from './types';
import { INITIAL_CODE_PYTHON as CODE_SAMPLE } from './constants';

function App() {
  // State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'chat' | 'snippets'>('dashboard');
  const [activeMode, setActiveMode] = useState<Mode>('explain');
  const [activeLanguage, setActiveLanguage] = useState('python');
  const [code, setCode] = useState(CODE_SAMPLE);
  const [errorInput, setErrorInput] = useState('');
  
  // Chat State
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Snippets
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // --- AUTH & PERSISTENCE ---
  useEffect(() => {
    // Check for redirect result (fallback for popup blocked)
    checkRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || 'User'
        });
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const loadUserData = async () => {
      setDataLoading(true);
      try {
        const dbChats = await getUserChats(user.id);
        const dbSnippets = await getUserSnippets(user.id);
        const dbContext = await getUserContext(user.id);
        
        if (dbChats.length > 0) setChats(dbChats);
        if (dbSnippets.length > 0) setSnippets(dbSnippets);
        if (dbContext) {
          setCode(dbContext.code);
          setActiveLanguage(dbContext.language);
        }
      } catch (error) {
        console.error("Failed to load user data", error);
      } finally {
        setDataLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // Save data on change to Firestore
    const saveData = async () => {
      await saveUserChats(user.id, chats);
      await saveUserSnippets(user.id, snippets);
      await saveUserContext(user.id, { code, language: activeLanguage });
    };
    
    // Debounce could be added here for performance, but for now we save on every change
    const timeoutId = setTimeout(saveData, 1000);
    return () => clearTimeout(timeoutId);
  }, [chats, snippets, user, code, activeLanguage]);

  // --- ACTIONS ---

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setView('dashboard');
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-500 flex-col gap-4">
        <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        <p className="animate-pulse">{authLoading ? 'Authenticating...' : 'Loading your workspace...'}</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={(u) => setUser({ id: u.uid, email: u.email, name: u.displayName })} />;
  }

  const startNewChat = () => {
    const newChat: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Session',
      messages: [],
      codeContext: code,
      language: activeLanguage,
      mode: activeMode,
      createdAt: Date.now(),
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setView('chat');
  };

  const handleSendMessage = async (msgText: string) => {
    if (!currentChatId) return;

    // Optimistic UI update
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: msgText, timestamp: Date.now() };
    
    setChats(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        return { 
            ...chat, 
            messages: [...chat.messages, userMsg],
            title: chat.messages.length === 0 ? msgText.slice(0, 30) + '...' : chat.title
        };
      }
      return chat;
    }));

    setLoading(true);

    try {
      const activeChat = chats.find(c => c.id === currentChatId) || { messages: [] };
      const history = activeChat.messages; 

      // Include error context if present
      const fullMessage = errorInput 
        ? `${msgText}\n\nERROR CONTEXT:\n${errorInput}` 
        : msgText;

      const responseText = await sendMessageToGemini(
        fullMessage,
        code,
        activeLanguage,
        activeMode,
        history
      );

      const aiMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: responseText, timestamp: Date.now() };

      setChats(prev => prev.map(chat => {
        if (chat.id === currentChatId) {
          return { ...chat, messages: [...chat.messages, aiMsg] };
        }
        return chat;
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveSnippet = (content: string) => {
    const newSnippet: Snippet = {
      id: crypto.randomUUID(),
      title: `Snippet from ${new Date().toLocaleTimeString()}`,
      language: activeLanguage,
      code: content, // Storing the answer as code/note mixed for now
      createdAt: Date.now()
    };
    setSnippets(prev => [newSnippet, ...prev]);
    alert("Snippet saved to library!");
  };

  // --- VIEWS ---

  if (!user) {
    return <Login onLoginSuccess={setUser} />;
  }

  const activeChat = chats.find(c => c.id === currentChatId);

  return (
    <div className="min-h-screen w-full bg-black text-gray-100 flex flex-col perspective-container overflow-hidden">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-cyan-900/20 rounded-full blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 h-14 border-b border-white/10 bg-black/80 backdrop-blur-xl flex items-center justify-between px-6 shadow-lg">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
          <Box className="text-cyan-400" />
          <span className="font-bold text-lg tracking-tight">CodeBuddy</span>
        </div>
        
        <div className="flex items-center gap-6">
           <button 
             onClick={() => setView('dashboard')} 
             className={`text-sm hover:text-cyan-400 transition-colors ${view === 'dashboard' ? 'text-cyan-400' : 'text-gray-400'}`}
           >
             Dashboard
           </button>
           <button 
             onClick={() => setView('snippets')} 
             className={`text-sm hover:text-cyan-400 transition-colors ${view === 'snippets' ? 'text-cyan-400' : 'text-gray-400'}`}
           >
             Library
           </button>
           <div className="h-4 w-px bg-white/10" />
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center text-xs font-bold">
               {user.name.charAt(0)}
             </div>
             <button onClick={handleLogout} className="text-gray-500 hover:text-white">
               <LogOut size={16} />
             </button>
           </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 relative z-10 p-6 pt-12 flex flex-col overflow-hidden justify-center">
        
        {view === 'dashboard' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full gap-8"
          >
             <div className="text-center space-y-2">
               <h2 className="text-3xl font-bold">Hello, {user.name.split(' ')[0]}</h2>
               <p className="text-gray-400">What would you like to achieve today?</p>
             </div>

             <div className="grid grid-cols-1 gap-4 w-full max-w-2xl">
                {[
                  { id: 'explain', icon: MessageSquare, title: 'Explain', desc: 'Understand code logic', color: 'cyan' },
                  { id: 'debug', icon: Zap, title: 'Debug', desc: 'Fix errors instantly', color: 'red' },
                  { id: 'optimize', icon: Terminal, title: 'Optimize', desc: 'Improve complexity', color: 'purple' },
                  { id: 'document', icon: FileText, title: 'Document', desc: 'Generate Readme', color: 'green' }
                ].map((item) => (
                  <TiltCard 
                    key={item.id} 
                    onClick={() => {
                      setActiveMode(item.id as Mode);
                      startNewChat();
                    }}
                    className="glass-panel p-6 rounded-xl flex flex-row items-center gap-6 group text-left transition-all hover:bg-white/5"
                  >
                    <div className={`w-16 h-16 shrink-0 rounded-2xl bg-${item.color}-500/10 flex items-center justify-center text-${item.color}-400 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(0,0,0,0.3)]`}>
                      <item.icon size={32} />
                    </div>
                    <div className="flex-1 flex items-center gap-4">
                      <h3 className="font-bold text-xl">{item.title}</h3>
                      <p className="text-gray-400 m-0">{item.desc}</p>
                    </div>
                  </TiltCard>
                ))}
             </div>

             {chats.length > 0 && (
               <div className="w-full mt-8">
                 <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Recent Sessions</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   {chats.slice(0, 3).map(chat => (
                     <div 
                        key={chat.id}
                        onClick={() => {
                          setCurrentChatId(chat.id);
                          setCode(chat.codeContext);
                          setActiveLanguage(chat.language);
                          setActiveMode(chat.mode);
                          setView('chat');
                        }}
                        className="glass-panel p-4 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                      >
                       <div className="flex items-center gap-2 mb-2">
                         <span className={`text-[10px] px-2 py-0.5 rounded bg-white/10 uppercase ${
                           chat.mode === 'debug' ? 'text-red-400' : chat.mode === 'optimize' ? 'text-purple-400' : 'text-cyan-400'
                         }`}>{chat.mode}</span>
                         <span className="text-xs text-gray-500 ml-auto">{new Date(chat.createdAt).toLocaleDateString()}</span>
                       </div>
                       <p className="font-medium truncate text-gray-300">{chat.title}</p>
                     </div>
                   ))}
                 </div>
               </div>
             )}
          </motion.div>
        )}

        {view === 'snippets' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={() => setView('dashboard')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Bookmark className="text-cyan-400" /> Saved Snippets
              </h2>
            </div>
            <div className="grid gap-4">
              {snippets.length === 0 ? (
                <p className="text-gray-500">No snippets saved yet. Start a chat!</p>
              ) : snippets.map(snip => (
                 <div key={snip.id} className="glass-panel p-6 rounded-xl">
                   <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold">{snip.title}</h3>
                        <span className="text-xs text-gray-500 font-mono">{snip.language}</span>
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(snip.code);
                          alert("Copied!");
                        }}
                        className="text-cyan-400 hover:text-cyan-300 text-sm"
                      >
                        Copy
                      </button>
                   </div>
                   <pre className="bg-black/50 p-4 rounded-lg overflow-x-auto text-sm text-gray-300 font-mono">
                     {snip.code}
                   </pre>
                 </div>
              ))}
            </div>
          </motion.div>
        )}

        {view === 'chat' && (
          <div className="flex flex-col h-full overflow-hidden w-full pt-8 px-4">
            <div className="mb-6 flex items-center gap-2 shrink-0">
              <button 
                onClick={() => setView('dashboard')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white flex items-center gap-2 text-lg font-medium"
              >
                <ArrowLeft size={20} /> Back to Dashboard
              </button>
            </div>
            <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 overflow-hidden pb-4">
            
            {/* Language Sidebar */}
            <motion.div 
              initial={{ x: -20, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }}
              className="hidden md:flex flex-col gap-2 bg-white/5 rounded-lg p-2 h-full overflow-y-auto shrink-0 w-32 border border-white/10"
            >
               <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">Language</h3>
               {LANGUAGES.map(lang => (
                 <button
                   key={lang.value}
                   onClick={() => setActiveLanguage(lang.value)}
                   className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${activeLanguage === lang.value ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                 >
                   {lang.label}
                 </button>
               ))}
            </motion.div>

            {/* Left Col: Code */}
            <motion.div 
              initial={{ x: -20, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }}
              className="flex-1 flex flex-col min-w-0 h-full"
            >
               <div className="flex items-center justify-end mb-3 shrink-0">
                 {/* Mobile Language Dropdown (visible only on small screens) */}
                 <div className="md:hidden mr-auto">
                    <select 
                      value={activeLanguage}
                      onChange={(e) => setActiveLanguage(e.target.value)}
                      className="bg-slate-800 text-white text-xs rounded px-2 py-1 border border-slate-700 outline-none"
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang.value} value={lang.value}>{lang.label}</option>
                      ))}
                    </select>
                 </div>

                 <div className="flex gap-2 items-center">
                    <button
                      onClick={() => setView('dashboard')}
                      className="text-[10px] uppercase font-bold px-2 py-1 rounded border border-transparent text-gray-500 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1"
                      title="Back to Dashboard"
                    >
                      <ArrowLeft size={12} />
                    </button>
                    <div className="w-px h-4 bg-white/10" />
                    {(['explain', 'debug', 'optimize', 'document'] as Mode[]).map(m => (
                      <button
                        key={m}
                        onClick={() => setActiveMode(m)}
                        className={`text-[10px] uppercase font-bold px-2 py-1 rounded border transition-all ${activeMode === m ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                      >
                        {m}
                      </button>
                    ))}
                 </div>
               </div>
               
               <div className="flex-1 relative min-h-0 flex flex-col gap-4">
                 <div className="flex-1 relative min-h-0">
                   <CodeEditor 
                     code={code} 
                     setCode={setCode} 
                     language={activeLanguage} 
                   />
                 </div>
                 
                 {/* Error / Output Console */}
                 <div className="h-32 shrink-0 bg-slate-900/50 border border-slate-800 rounded-lg flex flex-col overflow-hidden">
                   <div className="px-3 py-1 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between">
                     <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                       <Zap size={12} /> Error / Output Log
                     </span>
                     <button 
                       onClick={() => setErrorInput('')}
                       className="text-[10px] text-slate-500 hover:text-white"
                     >
                       Clear
                     </button>
                   </div>
                   <textarea
                     value={errorInput}
                     onChange={(e) => setErrorInput(e.target.value)}
                     placeholder="Paste any error messages or console output here..."
                     className="flex-1 bg-transparent p-3 text-xs font-mono text-red-300 placeholder-slate-600 resize-none focus:outline-none"
                   />
                 </div>
               </div>
            </motion.div>

            {/* Right Col: Chat */}
            <motion.div 
              initial={{ x: 20, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }}
              className="flex-1 flex flex-col min-w-0 h-full"
            >
              <div className="mb-4 flex items-center justify-between shrink-0">
                <h3 className="text-2xl font-bold flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    activeMode === 'debug' ? 'bg-red-500 shadow-[0_0_10px_red]' : 
                    activeMode === 'optimize' ? 'bg-purple-500 shadow-[0_0_10px_purple]' : 'bg-cyan-500 shadow-[0_0_10px_cyan]'
                  }`} />
                  {activeMode.charAt(0).toUpperCase() + activeMode.slice(1)} Mode
                </h3>
                {activeChat && (
                  <button onClick={startNewChat} className="text-sm text-gray-400 hover:text-white flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                     <Zap size={14} /> New Chat
                  </button>
                )}
              </div>
              <div className="flex-1 min-h-0 relative">
                <ChatBox 
                    messages={activeChat ? activeChat.messages : []} 
                    loading={loading}
                    onSendMessage={handleSendMessage}
                    onSaveSnippet={saveSnippet}
                />
              </div>
            </motion.div>
          </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;