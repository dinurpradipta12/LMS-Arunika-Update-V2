import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'pink' | 'yellow' | 'green';
  // Use React.ComponentType to allow any valid React component as an icon, including custom SVGs
  icon?: React.ComponentType<any>;
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
  const baseStyles = "px-5 py-2.5 rounded-xl font-semibold whitespace-nowrap flex items-center justify-center gap-2 border transition-bounce disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] shadow-sm";
  
  const variants = {
    primary: "bg-[var(--accent)] border-[var(--accent)] text-white hover:bg-[var(--accent-hover)] hover:border-[var(--accent-hover)]",
    secondary: "bg-[var(--surface)] border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-soft)] hover:border-[var(--border-strong)]",
    accent: "bg-[var(--accent)] border-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
    pink: "bg-[var(--accent-soft)] border-[var(--border)] text-[var(--accent-strong)] hover:border-[var(--border-strong)]",
    yellow: "bg-[var(--accent-soft)] border-[var(--border)] text-[var(--accent-strong)] hover:border-[var(--border-strong)]",
    green: "bg-[var(--success-soft)] border-[var(--border)] text-[var(--success-text)] hover:border-[var(--border-strong)]"
  };

  return (
    <button className={`${baseStyles} ${variants[variant as keyof typeof variants]} ${className}`} {...props}>
      {isLoading ? "Loading..." : children}
      {Icon && !isLoading && <Icon size={17} strokeWidth={2} />}
    </button>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; featured?: boolean }> = ({ children, className = '', featured }) => {
  return (
    <div className={`bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 transition-bounce shadow-sm ${featured ? 'ring-1 ring-[var(--accent-soft)]' : ''} ${className}`}>
      {children}
    </div>
  );
};

// Use React.ComponentType for the icon prop to avoid strict LucideIcon type mismatch errors when using custom components
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; icon?: React.ComponentType<any> }> = ({ label, icon: Icon, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-xs font-semibold text-[var(--muted)]">{label}</label>}
      <div className="relative">
        <input 
          className={`w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl py-3 text-[var(--text)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent)_12%,transparent)] transition-all outline-none min-h-[46px] ${Icon ? 'pl-11 pr-4' : 'px-4'} ${className}`}
          {...props}
        />
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
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
      {label && <label className="text-xs font-semibold text-[var(--muted)]">{label}</label>}
      <textarea 
        className={`bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent)_12%,transparent)] transition-all outline-none min-h-[120px] ${className}`}
        {...props}
      />
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; color?: string; className?: string }> = ({ children, color = 'var(--accent-soft)', className = '' }) => (
  <span 
    className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider border border-[var(--border)] text-[var(--text)] ${className}`}
    style={{ backgroundColor: color }}
  >
    {children}
  </span>
);
