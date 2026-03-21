'use client';

import { ThemeProvider } from 'next-themes';
import { SyncProvider } from './lib/sync';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SyncProvider>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>{children}</ThemeProvider>
        </SyncProvider>
    );
}
