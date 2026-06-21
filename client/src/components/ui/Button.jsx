import React from 'react';
import clsx from 'clsx';

const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 border border-transparent',
  secondary: 'bg-white text-blue-700 hover:bg-blue-50 focus:ring-blue-500 border-2 border-blue-600',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-300 border border-transparent',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border border-transparent',
  outline: 'bg-transparent text-gray-700 hover:bg-gray-50 focus:ring-gray-300 border border-gray-300',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg',
};

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  loading,
  type = 'button',
  onClick,
  ...props
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-lg',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
};

export default Button;
