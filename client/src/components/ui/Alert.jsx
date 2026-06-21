import React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import clsx from 'clsx';

const variants = {
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: Info,
    iconClass: 'text-blue-500',
  },
  success: {
    container: 'bg-green-50 border-green-200 text-green-800',
    icon: CheckCircle,
    iconClass: 'text-green-500',
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    icon: AlertCircle,
    iconClass: 'text-yellow-500',
  },
  error: {
    container: 'bg-red-50 border-red-200 text-red-800',
    icon: XCircle,
    iconClass: 'text-red-500',
  },
};

const Alert = ({ variant = 'info', title, children, onClose, className }) => {
  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        'flex gap-3 p-4 rounded-lg border',
        config.container,
        className
      )}
      role="alert"
    >
      <Icon size={18} className={clsx('flex-shrink-0 mt-0.5', config.iconClass)} />
      <div className="flex-1 min-w-0">
        {title && (
          <p className="font-semibold text-sm mb-1">{title}</p>
        )}
        {children && (
          <p className="text-sm">{children}</p>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 p-0.5 hover:opacity-70 transition-opacity"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default Alert;
