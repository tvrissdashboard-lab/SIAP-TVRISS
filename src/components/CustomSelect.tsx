import React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Dropdown } from './Dropdown';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  id: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  id,
  value,
  options,
  onChange,
  placeholder = 'Pilih...',
  className = ''
}) => {
  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  return (
    <Dropdown
      id={id}
      align="left"
      className={`w-full ${className}`}
      menuClassName="w-full min-w-[220px] max-h-60 overflow-y-auto"
      trigger={({ isOpen, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className={`w-full flex items-center justify-between bg-slate-50 border px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-800 transition ${
            isOpen
              ? 'border-blue-600 ring-2 ring-blue-500/20 bg-white'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
          }`}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </button>
      )}
    >
      {({ close }) => (
        <div className="py-1 text-xs">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  close();
                }}
                className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </Dropdown>
  );
};
