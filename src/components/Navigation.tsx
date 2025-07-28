'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: '🏠 Main App', icon: '🏠' },
    { href: '/mouse-test', label: '🖱️ Mouse Test', icon: '🖱️' },
    { href: '/test-driving', label: '🚗 Test Driving', icon: '🚗' },
    { href: '/eth-3d', label: '🎨 ETH Logo 3D', icon: '🎨' },
    { href: '/spline-3d', label: '🎨 Spline 3D', icon: '🎨' },
  ];

  return (
    <nav style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(10px)',
      borderRadius: '15px',
      padding: '10px 20px',
      display: 'flex',
      gap: '10px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
    }}>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          style={{
            textDecoration: 'none',
            color: pathname === item.href ? '#4CAF50' : '#fff',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: pathname === item.href ? 'bold' : 'normal',
            background: pathname === item.href ? 'rgba(76, 175, 80, 0.2)' : 'transparent',
            border: pathname === item.href ? '1px solid #4CAF50' : '1px solid transparent',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => {
            if (pathname !== item.href) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (pathname !== item.href) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          <span style={{ fontSize: '16px' }}>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
} 