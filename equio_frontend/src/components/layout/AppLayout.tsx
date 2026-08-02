import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { useProfile } from '../../hooks/useProfile';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile();

  useEffect(() => {
    if (profile?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (profile?.theme === 'light') {
      document.documentElement.classList.remove('dark');
    }
  }, [profile?.theme]);

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 bg-transparent transition-colors duration-300">
        <div className="pt-4 pb-0 px-6 md:px-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
