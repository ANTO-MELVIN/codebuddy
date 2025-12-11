import React from 'react';

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  language: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, setCode, language }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      
      const newValue = value.substring(0, start) + '    ' + value.substring(end);
      setCode(newValue);
      
      // We need to defer setting selection range to next tick because React render updates value
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
  };

  return (
    <div className="relative w-full h-full glass-panel rounded-xl overflow-hidden flex flex-col group">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
        </div>
        <span className="text-xs text-white/40 font-mono uppercase tracking-wider">{language} EDITOR</span>
      </div>
      
      <div className="relative flex-1 bg-[#0a0a0a]/50">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          className="absolute inset-0 w-full h-full p-4 bg-transparent text-gray-300 font-mono text-sm resize-none focus:outline-none leading-relaxed"
          spellCheck={false}
          placeholder="// Paste or type your code here..."
        />
        {/* Decorative corner accent */}
        <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-cyan-500/10 to-transparent pointer-events-none" />
      </div>
    </div>
  );
};