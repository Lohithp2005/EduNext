'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LocalePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect any locale-prefixed routes to the home page
    // Since we're using context-based i18n, not URL-based
    router.push('/');
  }, [router]);

  return null;
}
