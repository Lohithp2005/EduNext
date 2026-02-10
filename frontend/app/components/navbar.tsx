'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { name: 'Home', href: `/` },
    { name: 'For Kids', href: `/child` },
    { name: 'For Parents', href: `/parent` },
    { name: 'Pricing', href: `/pricing` },
  ];

  const isActive = (href: string) => {
    if (href === '/' && pathname === '/') return true;
    if (
      href === '/child' &&
      (pathname === '/child' ||
        pathname.startsWith('/course') ||
        pathname.startsWith('/theory') ||
        pathname.startsWith('/quiz') ||
        pathname.startsWith('/flashcard') ||
        pathname.startsWith('/mini-test') ||
        pathname.startsWith('/reading') ||
        pathname.startsWith('/speech') ||
        pathname.startsWith('/story'))
    )
      return true;
    if (href !== '/' && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <nav className="h-[70px] relative w-full px-6 md:px-16 lg:px-24 xl:px-32 flex items-center justify-between z-20 bg-white text-gray-700 shadow-[0px_4px_25px_0px_#0000000D] transition-all">
      {/* Logo */}
      <Link href="/" className="text-purple-600">
        <h2 className="text-2xl font-bold">EduNext</h2>
      </Link>

      {/* Desktop menu */}
      <ul className="md:flex hidden items-center gap-10">
        {navLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`hover:text-gray-500/80 transition ${
                isActive(link.href)
                  ? 'underline underline-offset-4 decoration-purple-600'
                  : ''
              }`}
            >
              {link.name}
            </Link>
          </li>
        ))}
      </ul>

      {/* Right actions */}
      <div className="hidden md:flex items-center gap-4">
        {/* Empty language dropdown */}
        <div className="relative">
          <select
            aria-label="Language"
            className="h-10 pl-3 pr-9 rounded-full border border-purple-300 text-sm bg-white cursor-pointer appearance-none outline-none"
          >
            <option value="">Language</option>
          </select>

          {/* Arrow */}
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 8 10 12 14 8" />
          </svg>
        </div>
      </div>

      {/* Mobile menu button */}
      <button
        aria-label="menu-btn"
        onClick={() => setOpen(!open)}
        className="inline-block md:hidden active:scale-90 transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30" fill="#000">
          <path d="M 3 7 A 1.0001 1.0001 0 1 0 3 9 L 27 9 A 1.0001 1.0001 0 1 0 27 7 L 3 7 z M 3 14 A 1.0001 1.0001 0 1 0 3 16 L 27 16 A 1.0001 1.0001 0 1 0 27 14 L 3 14 z M 3 21 A 1.0001 1.0001 0 1 0 3 23 L 27 23 A 1.0001 1.0001 0 1 0 27 21 L 3 21 z"></path>
        </svg>
      </button>

      {/* Mobile menu */}
      {open && (
        <div className="absolute top-[70px] left-0 w-full bg-white pb-2 md:hidden flex flex-col items-center border-b border-purple-500 rounded-b-2xl">
          <ul className="flex flex-col space-y-4 text-lg text-purple-600 items-center w-full">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`text-sm ${
                    isActive(link.href)
                      ? 'underline underline-offset-4 decoration-purple-600'
                      : ''
                  }`}
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>

          {/* Mobile language dropdown (empty) */}
          <div className="py-4 w-full px-4">
            <select
              aria-label="Language"
              className="w-full h-10 pl-3 pr-9 rounded-full border border-purple-300 text-sm bg-white cursor-pointer appearance-none outline-none"
            >
              <option value="">Language</option>
            </select>
          </div>
        </div>
      )}
    </nav>
  );
}
