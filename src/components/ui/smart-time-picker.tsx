import React, { useRef } from 'react';
import { Button } from './button';
import { Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

interface SmartTimePickerProps {
  value: string; // HH:mm
  onChange: (time: string) => void;
  className?: string;
  label?: string;
}

export function SmartTimePicker({ value, onChange, className, label }: SmartTimePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleContainerClick = () => {
    if (inputRef.current) {
      const el = inputRef.current as any;
      if ('showPicker' in el) {
         try {
            el.showPicker();
         } catch(e) {
            el.focus();
         }
      } else {
         el.focus();
      }
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      {/* Invisible native input placed over the button for pure mobile interaction */}
      <input
        ref={inputRef}
        type="time"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      
      <Button
        type="button"
        variant="outline"
        className={cn(
          "w-full justify-between rtl:flex-row-reverse text-right font-medium text-lg h-12 rounded-2xl bg-secondary/30 border-none hover:bg-secondary/50 transition-colors px-4",
          !value && "text-muted-foreground",
          "relative z-0"
        )}
      >
        {value ? (
          <div className="flex items-center gap-2 pointer-events-none">
            <span className="font-mono text-xl text-indigo-500 font-bold bg-background px-2 py-0.5 rounded-lg shadow-sm border border-border/50">{value}</span>
          </div>
        ) : (
           <span className="pointer-events-none">{label || 'اختر الوقت'}</span>
        )}
        <Clock className="h-5 w-5 text-indigo-500/70 pointer-events-none" />
      </Button>
    </div>
  );
}

