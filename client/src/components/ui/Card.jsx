import React from 'react';
import clsx from 'clsx';

const Card = ({ children, className, padding = true, ...props }) => {
  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-gray-200 shadow-sm',
        padding && 'p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

Card.Header = ({ children, className, ...props }) => (
  <div className={clsx('mb-4', className)} {...props}>
    {children}
  </div>
);

Card.Title = ({ children, className, ...props }) => (
  <h3 className={clsx('text-lg font-semibold text-gray-900', className)} {...props}>
    {children}
  </h3>
);

Card.Body = ({ children, className, ...props }) => (
  <div className={clsx('', className)} {...props}>
    {children}
  </div>
);

Card.Footer = ({ children, className, ...props }) => (
  <div className={clsx('mt-4 pt-4 border-t border-gray-100', className)} {...props}>
    {children}
  </div>
);

export default Card;
