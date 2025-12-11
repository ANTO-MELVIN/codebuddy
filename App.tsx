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
  Box
} from 'lucide-react';
import { TiltCard } from './components/UI/TiltCard';
import { NeonButton } from './components/UI/NeonButton';
import { CodeEditor } from './components/Editor/CodeEditor';
import { ChatBox } from './components/Chat/ChatBox';
import { Login } from './components/Auth/Login';
import { sendMessageToGemini } from './services/geminiService';
import { auth, logout } from './services/firebase';
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
  
  // Chat State
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Snippets
  const [snippets, setSnippets] = useState<Snippet[]>([]);

  // --- AUTH & PERSISTENCE ---
  useEffect(() => {
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
    // Load data from localStorage on mount (or replace with DB fetch later)
    const savedChats = localStorage.getItem(`cb_chats_${user.id}`);
    const savedSnippets = localStorage.getItem(`cb_snippets_${user.id}`);
    if (savedChats) setChats(JSON.parse(savedChats));
    if (savedSnippets) setSnippets(JSON.parse(savedSnippets));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // Save data on change
    localStorage.setItem(`cb_chats_${user.id}`, JSON.stringify(chats));
    localStorage.setItem(`cb_snippets_${user.id}`, JSON.stringify(snippets));
  }, [chats, snippets, user]);

  // --- ACTIONS ---

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setView('dashboard');
  };

  if (authLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-500">Loading...</div>;
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
      const history = activeChat.messages; // We use the state before optimistic update for safety or pass new

      const responseText = await sendMessageToGemini(
        msgText,
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
    return (
      <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-black">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_70%)] animate-pulse" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
        
        <TiltCard className="p-8 glass-panel rounded-2xl max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500 blur-2xl opacity-40 animate-pulse" />
              <Box size={64} className="text-cyan-400 relative z-10" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            CodeBuddy
          </h1>
          <p className="text-gray-400 mb-8">
            Your AI-powered coding companion. Explain, debug, optimize, and document with a single click.
          </p>
          <NeonButton onClick={handleLogin} className="w-full justify-center">
            <Github size={20} />
            Sign in with Simulated Auth
          </NeonButton>
          <div className="mt-4 text-xs text-gray-500">
            Powered by Gemini 2.5 • React • Tailwind
          </div>
        </TiltCard>
      </div>
    );
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
      <nav className="relative z-50 h-16 border-b border-white/10 bg-black/50 backdrop-blur-lg flex items-center justify-between px-6">
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
      <main className="flex-1 relative z-10 p-6 flex flex-col overflow-hidden">
        
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

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
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
                    className="glass-panel p-6 rounded-xl flex flex-col gap-4 group"
                  >
                    <div className={`w-12 h-12 rounded-lg bg-${item.color}-500/10 flex items-center justify-center text-${item.color}-400 group-hover:scale-110 transition-transform`}>
                      <item.icon size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{item.title}</h3>
                      <p className="text-sm text-gray-500">{item.desc}</p>
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
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Bookmark className="text-cyan-400" /> Saved Snippets
            </h2>
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
          <div className="flex-1 flex flex-col md:flex-row gap-6 h-[calc(100vh-100px)]">
            {/* Left Col: Code */}
            <motion.div 
              initial={{ x: -20, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }}
              className="flex-1 flex flex-col min-w-0"
            >
               <div className="flex items-center justify-between mb-3">
                 <div className="flex bg-white/5 rounded-lg p-1">
                   {LANGUAGES.map(lang => (
                     <button
                       key={lang.value}
                       onClick={() => setActiveLanguage(lang.value)}
                       className={`px-3 py-1 rounded text-xs transition-all ${activeLanguage === lang.value ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                     >
                       {lang.label}
                     </button>
                   ))}
                 </div>
                 <div className="flex gap-2">
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
               
               <div className="flex-1 relative">
                 <CodeEditor 
                   code={code} 
                   setCode={setCode} 
                   language={activeLanguage} 
                 />
               </div>
            </motion.div>

            {/* Right Col: Chat */}
            <motion.div 
              initial={{ x: 20, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }}
              className="flex-1 flex flex-col min-w-0 max-w-xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    activeMode === 'debug' ? 'bg-red-500 shadow-[0_0_10px_red]' : 
                    activeMode === 'optimize' ? 'bg-purple-500 shadow-[0_0_10px_purple]' : 'bg-cyan-500 shadow-[0_0_10px_cyan]'
                  }`} />
                  {activeMode.charAt(0).toUpperCase() + activeMode.slice(1)} Mode
                </h3>
                {activeChat && (
                  <button onClick={startNewChat} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                     <Zap size={12} /> New Chat
                  </button>
                )}
              </div>
              <ChatBox 
                messages={activeChat ? activeChat.messages : []} 
                loading={loading}
                onSendMessage={handleSendMessage}
                onSaveSnippet={saveSnippet}
              />
            </motion.div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;