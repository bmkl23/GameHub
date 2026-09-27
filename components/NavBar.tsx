'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/wheel-picker', label: '🎡 Wheel Picker' },
  { href: '/nexora', label: '🏃 Nexora' },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        background: '#0b1017',
        borderBottom: '1px solid #223142',
        fontFamily: 'monospace',
      }}
    >
      <span style={{ color: '#57c7ff', fontWeight: 700, letterSpacing: 1, marginRight: 12 }}>
        GAME HUB
      </span>
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #2f4258',
              background: active ? '#1c2b3a' : 'transparent',
              color: active ? '#cfe3f5' : '#7f96ab',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 0.5,
              textDecoration: 'none',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
