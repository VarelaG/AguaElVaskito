import Navbar from './components/Navbar';
import './globals.css';

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
    <html lang="es">
      <body className="antialiased">
        {children}
        <Navbar />
      </body>
    </html>
  );
}