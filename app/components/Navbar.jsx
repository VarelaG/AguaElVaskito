'use client';
import Link from 'next/link';
import { HomeIcon, UsersIcon, ChartBarIcon, Cog8ToothIcon } from '@heroicons/react/24/outline';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const pathname = usePathname();

  // --- AGREGÁ ESTA LÓGICA AQUÍ ---
  if (pathname === '/login') {
    return null;
  }
  // ------------------------------

  const estiloActivo = "text-blue-600 dark:text-blue-400";
  const estiloInactivo = "text-gray-500 dark:text-neutral-500";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-gray-100 dark:border-neutral-800 h-16 flex items-center justify-around pb-1 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] dark:shadow-none">
      <Link href="/" className={`flex flex-col items-center ${pathname === '/' ? estiloActivo : estiloInactivo}`}>
        <HomeIcon className="h-6 w-6" />
        <span className="text-[10px] font-bold">REPARTO</span>
      </Link>

      <Link href="/clientes" className={`flex flex-col items-center ${pathname === '/clientes' ? estiloActivo : estiloInactivo}`}>
        <UsersIcon className="h-6 w-6" />
        <span className="text-[10px] font-bold">CLIENTES</span>
      </Link>

      <Link href="/resumen" className={`flex flex-col items-center ${pathname === '/resumen' ? estiloActivo : estiloInactivo}`}>
        <ChartBarIcon className="h-6 w-6" />
        <span className="text-[10px] font-bold">RESUMEN</span>
      </Link>

      <Link href="/config" className={`flex flex-col items-center ${pathname === '/config' ? estiloActivo : estiloInactivo}`}>
        <Cog8ToothIcon className="h-6 w-6" />
        <span className="text-[10px] font-black">AJUSTES</span>
      </Link>
    </nav>
  );
}