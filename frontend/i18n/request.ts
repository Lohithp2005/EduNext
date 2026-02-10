import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;

  // Type guard to ensure requested is a valid locale
  const isValidLocale = (loc: string | undefined): loc is typeof routing.locales[number] =>
    !!loc && routing.locales.includes(loc as any);

  const locale: typeof routing.locales[number] = isValidLocale(requested)
    ? requested
    : routing.defaultLocale;

  const messages = (await import(`../messages/${locale}.json`)).default;

  return { locale, messages };
});
