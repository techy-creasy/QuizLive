import { forwardRef } from 'react';

// ─── Button ──────────────────────────────────────────────
export const Button = ({ children, variant = 'primary', size = 'md', loading, className = '', ...props }) => {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    ghost: 'bg-transparent hover:bg-slate-700 text-slate-300 font-medium px-5 py-2.5 rounded-xl transition-all',
  };
  const sizes = {
    sm: '!px-3 !py-1.5 text-sm',
    md: '',
    lg: '!px-7 !py-3.5 text-lg',
  };

  return (
    <button
      className={`${variants[variant]} ${sizes[size]} ${className} inline-flex items-center justify-center gap-2`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
};

// ─── Input ───────────────────────────────────────────────
export const Input = forwardRef(({ label, error, icon, className = '', ...props }, ref) => (
  <div className="w-full">
    {label && <label className="label">{label}</label>}
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
      )}
      <input
        ref={ref}
        className={`input-field ${icon ? 'pl-10' : ''} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''} ${className}`}
        {...props}
      />
    </div>
    {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
  </div>
));
Input.displayName = 'Input';

// ─── Select ──────────────────────────────────────────────
export const Select = forwardRef(({ label, error, options = [], className = '', ...props }, ref) => (
  <div className="w-full">
    {label && <label className="label">{label}</label>}
    <select
      ref={ref}
      className={`input-field ${error ? 'border-red-500' : ''} ${className}`}
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
  </div>
));
Select.displayName = 'Select';

// ─── Card ────────────────────────────────────────────────
export const Card = ({ children, className = '', ...props }) => (
  <div className={`card p-6 ${className}`} {...props}>
    {children}
  </div>
);

// ─── Badge ───────────────────────────────────────────────
export const Badge = ({ children, color = 'blue', className = '' }) => {
  const colors = {
    blue: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
    green: 'bg-green-500/15 text-green-400 border border-green-500/20',
    yellow: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
    red: 'bg-red-500/15 text-red-400 border border-red-500/20',
    purple: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
    pink: 'bg-pink-500/15 text-pink-400 border border-pink-500/20',
  };
  return (
    <span className={`badge ${colors[color]} ${className}`}>{children}</span>
  );
};

// ─── Spinner ─────────────────────────────────────────────
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <svg className={`animate-spin text-primary-500 ${sizes[size]} ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
};

// ─── Loading screen ──────────────────────────────────────
export const LoadingScreen = ({ text = 'Loading...' }) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4">
    <Spinner size="lg" />
    <p className="text-slate-400 text-sm">{text}</p>
  </div>
);

// ─── Empty state ─────────────────────────────────────────
export const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    {icon && <div className="text-5xl mb-4">{icon}</div>}
    <h3 className="text-xl font-display font-semibold text-slate-200 mb-2">{title}</h3>
    {description && <p className="text-slate-400 max-w-sm mb-6">{description}</p>}
    {action}
  </div>
);

// ─── Avatar ──────────────────────────────────────────────
export const Avatar = ({ src, name, size = 'md', className = '' }) => {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg' };
  return src ? (
    <img
      src={src}
      alt={name}
      className={`${sizes[size]} rounded-full object-cover border-2 border-slate-600 ${className}`}
    />
  ) : (
    <div className={`${sizes[size]} rounded-full bg-primary-500/20 border-2 border-primary-500/30 flex items-center justify-center font-semibold text-primary-400 ${className}`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
};

// ─── Modal ───────────────────────────────────────────────
export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card p-6 w-full max-w-md animate-bounce-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display font-semibold">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
