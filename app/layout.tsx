import Navbar from './components/Navbar';
import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'El Vaskito',
  description: 'Gestión de Reparto',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'El Vaskito',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased overflow-x-hidden max-w-full bg-[var(--background)] text-[var(--foreground)]">
        <Providers>
          {children}
          {/* El Navbar decidirá internamente si se dibuja o no */}
          <Navbar />
        </Providers>
      </body>
    </html>
  );
}