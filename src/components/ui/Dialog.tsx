import React from 'react';
import { XIcon } from 'lucide-react';

interface DialogProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ 
  title, 
  isOpen, 
  onClose, 
  children 
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-background/80">
      <div className="relative w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            className="rounded-full p-1 hover:bg-muted/50"
            onClick={onClose}
            aria-label="Close"
          >
            <XIcon size={18} />
          </button>
        </div>
        
        <div>
          {children}
        </div>
      </div>
    </div>
  );
};

interface ConfirmDialogProps extends Omit<DialogProps, 'children'> {
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  isOpen,
  onClose,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false
}) => {
  return (
    <Dialog title={title} isOpen={isOpen} onClose={onClose}>
      <p className="mb-6">{message}</p>
      
      <div className="flex justify-end gap-3">
        <button
          className="rounded-md px-4 py-2 text-sm font-medium hover:bg-muted/50"
          onClick={onClose}
          disabled={isLoading}
        >
          {cancelText}
        </button>
        <button
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : confirmText}
        </button>
      </div>
    </Dialog>
  );
}; 