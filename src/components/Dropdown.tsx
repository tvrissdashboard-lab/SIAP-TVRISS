import React from 'react';
import { useDropdownMenu } from '../lib/DropdownContext';

interface DropdownProps {
  id: string;
  trigger: (props: { isOpen: boolean; toggle: (e?: React.MouseEvent) => void }) => React.ReactNode;
  children: (props: { close: () => void; closeAll: () => void }) => React.ReactNode;
  align?: 'right' | 'left';
  className?: string;
  menuClassName?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  id,
  trigger,
  children,
  align = 'right',
  className = '',
  menuClassName = ''
}) => {
  const { isOpen, toggle, close, closeAll, ref } = useDropdownMenu(id);

  return (
    <div ref={ref} className={`relative inline-block text-left ${className}`}>
      {trigger({ isOpen, toggle })}

      <div
        className={`absolute ${
          align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
        } mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-2 transition-all duration-200 ease-out transform ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        } ${menuClassName}`}
      >
        {children({ close, closeAll })}
      </div>
    </div>
  );
};
