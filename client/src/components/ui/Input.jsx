import React, { forwardRef } from 'react';
import clsx from 'clsx';

const Input = forwardRef(({
  label,
  error,
  hint,
  className,
  id,
  required,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={clsx(
          'w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors duration-200',
          error
            ? 'border-red-400 focus:ring-red-500 focus:border-red-400 bg-red-50'
            : 'border-gray-300 focus:ring-blue-500 focus:border-transparent bg-white',
          'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {hint && !error && (
        <p className="text-sm text-gray-500">{hint}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
