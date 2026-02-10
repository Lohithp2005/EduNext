// lib/toast.ts
export const toast = {
  success: (message: string) => {
    console.log('✅', message);
    // Or use your existing toast library
  },
  error: (message: string) => {
    console.error('❌', message);
  },
  info: (message: string) => {
    console.log('ℹ️', message);
  },
};