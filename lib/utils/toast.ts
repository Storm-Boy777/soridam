/**
 * Toast 알림 유틸리티
 * react-hot-toast 라이브러리 사용
 */

import toast from 'react-hot-toast';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}

/**
 * Toast 메시지 표시
 */
export function showToast(
  message: string, 
  type: ToastType = 'info',
  options?: ToastOptions
) {
  const toastOptions = {
    duration: options?.duration || 3000,
    position: options?.position || 'top-center' as const,
  };

  switch (type) {
    case 'success':
      toast.success(message, toastOptions);
      break;
    case 'error':
      toast.error(message, toastOptions);
      break;
    case 'warning':
      // react-hot-toast doesn't have warning, use custom style
      toast(message, {
        ...toastOptions,
        icon: '⚠️',
        style: {
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
          color: '#fff',
        },
      });
      break;
    case 'info':
    default:
      toast(message, {
        ...toastOptions,
        icon: 'ℹ️',
      });
      break;
  }
}

/**
 * 성공 Toast
 */
export function showSuccessToast(message: string, options?: ToastOptions) {
  toast.success(message, {
    duration: options?.duration || 3000,
    position: options?.position || 'top-center' as const,
  });
}

/**
 * 오류 Toast
 */
export function showErrorToast(message: string, options?: ToastOptions) {
  toast.error(message, {
    duration: options?.duration || 3000,
    position: options?.position || 'top-center' as const,
  });
}

/**
 * 정보 Toast
 */
export function showInfoToast(message: string, options?: ToastOptions) {
  toast(message, {
    duration: options?.duration || 3000,
    position: options?.position || 'top-center' as const,
    icon: 'ℹ️',
  });
}

/**
 * 경고 Toast
 */
export function showWarningToast(message: string, options?: ToastOptions) {
  toast(message, {
    duration: options?.duration || 3000,
    position: options?.position || 'top-center' as const,
    icon: '⚠️',
    style: {
      background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
      color: '#fff',
    },
  });
}