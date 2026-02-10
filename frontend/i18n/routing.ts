import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'ta', 'kn', 'hi', 'te'],
  defaultLocale: 'en',
  localePrefix: 'never',
  pathnames: {
    '/': '/',
    '/child': '/child',
    '/parent': '/parent',
  }
});

export type Locale = (typeof routing.locales)[number];

export const {Link, redirect, usePathname, useRouter} =
  createNavigation(routing);
