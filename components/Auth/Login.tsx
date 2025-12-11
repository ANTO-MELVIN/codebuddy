import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, AlertCircle } from 'lucide-react';
import { NeonButton } from '../UI/NeonButton';
import { signInWithGoogle } from '../../services/firebase';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      const user = await signInWithGoogle();
      onLoginSuccess(user);
    } catch (err: any) {
      console.error("Login failed:", err);
      // Show full error details for debugging
      setError(`Error (${err.code}): ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_50%)]" />
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center"
      >
        <div className="mb-8 flex justify-center">
          <div className="w-16 h-16 bg-cyan-500/20 rounded-xl flex items-center justify-center border border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
            <LogIn className="w-8 h-8 text-cyan-400" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
        <p className="text-slate-400 mb-8">Sign in to CodeBuddy to continue your coding journey.</p>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-400 text-sm text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <NeonButton 
          onClick={handleGoogleLogin}
          className="w-full justify-center py-3"
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google" 
            className="w-5 h-5 mr-2"
          />
          Sign in with Google
        </NeonButton>

        <p className="mt-6 text-xs text-slate-500">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
};
