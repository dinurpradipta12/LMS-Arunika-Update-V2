import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'pink' | 'yellow' | 'green' | 'danger';
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
    green: "bg-[var(--success-soft)] border-[var(--border)] text-[var(--success-text)] hover:border-[var(--border-strong)]",
    danger: "bg-[var(--danger-text)] border-[var(--danger-text)] text-white hover:opacity-90"
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
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; icon?: React.ComponentType<any> }> = ({ label, icon: Icon, className = '', id, ...props }) => {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  return (
    <div className="flex flex-col gap-2">
      {label && <label htmlFor={inputId} className="text-xs font-semibold text-[var(--muted)]">{label}</label>}
      <div className="relative">
        <input
          id={inputId}
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

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, className = '', id, ...props }) => {
  const generatedId = React.useId();
  const textareaId = id || generatedId;

  return (
    <div className="flex flex-col gap-2">
      {label && <label htmlFor={textareaId} className="text-xs font-semibold text-[var(--muted)]">{label}</label>}
      <textarea
        id={textareaId}
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

export const ConfirmModal: React.FC<{
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  open,
  title,
  description,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  isLoading = false,
  onConfirm,
  onCancel
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !isLoading) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="arunika-confirm-modal-title"
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
        onMouseDown={event => event.stopPropagation()}
      >
        <h2 id="arunika-confirm-modal-title" className="text-xl font-bold text-[var(--text)]">{title}</h2>
        <div className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{description}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>{cancelLabel}</Button>
          <Button type="button" variant="danger" onClick={onConfirm} isLoading={isLoading}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
};
