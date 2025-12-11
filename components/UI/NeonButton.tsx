import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface NeonButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export const NeonButton: React.FC<NeonButtonProps> = ({ children, className = "", variant = 'primary', ...props }) => {
  const baseStyles = "px-6 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group";
  
  const variants = {
    primary: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500 hover:text-black hover:shadow-[0_0_20px_rgba(6,182,212,0.6)]",
    secondary: "bg-purple-500/10 text-purple-400 border border-purple-500/50 hover:bg-purple-500 hover:text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.6)]",
    danger: "bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500 hover:text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.6)]"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </motion.button>
  );
};