
import React from 'react';
import { ArrowRight, LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'pink' | 'yellow' | 'green';
  icon?: LucideIcon;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  icon: Icon, 
  className = '', 
  isLoading,
  ...props 
}) => {
  const baseStyles = "px-6 py-3 rounded-full font-bold flex items-center justify-center gap-2 border-2 border-[#1E293B] transition-bounce hard-shadow hard-shadow-hover hard-shadow-active disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[#8B5CF6] text-white",
    secondary: "bg-transparent text-[#1E293B] hover:bg-[#FBBF24]",
    accent: "bg-[#8B5CF6] text-white",
    pink: "bg-[#F472B6] text-white",
    yellow: "bg-[#FBBF24] text-[#1E293B]",
    green: "bg-[#34D399] text-[#1E293B]"
  };

  return (
    <button className={`${baseStyles} ${variants[variant as keyof typeof variants]} ${className}`} {...props}>
      {isLoading ? "Loading..." : children}
      {Icon && !isLoading && (
        <div className="bg-white rounded-full p-1 text-[#1E293B]">
          <Icon size={18} strokeWidth={2.5} />
        </div>
      )}
    </button>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; featured?: boolean }> = ({ children, className = '', featured }) => {
  return (
    <div className={`bg-white border-2 border-[#1E293B] rounded-2xl p-6 transition-bounce sticker-shadow hover:-rotate-1 hover:scale-[1.02] ${featured ? 'shadow-[#F472B6]' : ''} ${className}`}>
      {children}
    </div>
  );
};

// Fixed: Added 'icon' prop to Input component and updated it to render the icon if provided
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; icon?: LucideIcon }> = ({ label, icon: Icon, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-xs font-extrabold uppercase tracking-wide text-[#64748B] ml-1">{label}</label>}
      <div className="relative">
        <input 
          className={`w-full bg-white border-2 border-[#CBD5E1] rounded-xl py-3 text-[#1E293B] focus:border-[#8B5CF6] focus:ring-0 focus:hard-shadow transition-all outline-none ${Icon ? 'pl-11 pr-4' : 'px-4'} ${className}`}
          {...props}
        />
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]">
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  );
};

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-xs font-extrabold uppercase tracking-wide text-[#64748B] ml-1">{label}</label>}
      <textarea 
        className={`bg-white border-2 border-[#CBD5E1] rounded-xl px-4 py-3 text-[#1E293B] focus:border-[#8B5CF6] focus:ring-0 focus:hard-shadow transition-all outline-none min-h-[120px] ${className}`}
        {...props}
      />
    </div>
  );
};

// Added className to Badge component props to support custom styling and fix TS error
export const Badge: React.FC<{ children: React.ReactNode; color?: string; className?: string }> = ({ children, color = '#FBBF24', className = '' }) => (
  <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 border-[#1E293B] shadow-[2px 2px 0px 0px_#1E293B] ${className}`} style={{ backgroundColor: color }}>
    {children}
  </span>
);