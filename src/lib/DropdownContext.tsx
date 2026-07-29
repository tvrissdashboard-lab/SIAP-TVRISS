import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface DropdownContextType {
  activeDropdownId: string | null;
  openDropdown: (id: string) => void;
  closeDropdown: (id: string) => void;
  closeAllDropdowns: () => void;
}

const DropdownContext = createContext<DropdownContextType>({
  activeDropdownId: null,
  openDropdown: () => {},
  closeDropdown: () => {},
  closeAllDropdowns: () => {}
});

export const DropdownProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const openDropdown = useCallback((id: string) => {
    setActiveDropdownId(id);
  }, []);

  const closeDropdown = useCallback((id: string) => {
    setActiveDropdownId((prev) => (prev === id ? null : prev));
  }, []);

  const closeAllDropdowns = useCallback(() => {
    setActiveDropdownId(null);
  }, []);

  // Global ESC key listener to close active dropdowns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        closeAllDropdowns();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeAllDropdowns]);

  return (
    <DropdownContext.Provider value={{ activeDropdownId, openDropdown, closeDropdown, closeAllDropdowns }}>
      {children}
    </DropdownContext.Provider>
  );
};

export const useDropdownContext = () => useContext(DropdownContext);

export function useDropdownMenu(id: string) {
  const { activeDropdownId, openDropdown, closeDropdown, closeAllDropdowns } = useDropdownContext();
  const ref = React.useRef<HTMLDivElement>(null);

  const isOpen = activeDropdownId === id;

  const toggle = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isOpen) {
      closeDropdown(id);
    } else {
      openDropdown(id);
    }
  }, [isOpen, id, openDropdown, closeDropdown]);

  const close = useCallback(() => {
    if (isOpen) {
      closeDropdown(id);
    }
  }, [isOpen, id, closeDropdown]);

  // Click outside handling
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        closeDropdown(id);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, id, closeDropdown]);

  return {
    isOpen,
    toggle,
    close,
    closeAll: closeAllDropdowns,
    ref
  };
}
