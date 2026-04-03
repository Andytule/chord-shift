import React, { useEffect } from 'react';

export interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error';
}

interface Props {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

const Toast: React.FC<Props> = ({ toasts, onDismiss }) => (
  <div className="toast-container">
    {toasts.map((t) => (
      <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
    ))}
  </div>
);

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: number) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer: number = setTimeout(() => onDismiss(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className={`toast toast--${toast.type}`} onClick={() => onDismiss(toast.id)}>
      {toast.text}
    </div>
  );
};

export default Toast;
