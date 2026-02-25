import { Outlet, Link, useLocation } from 'react-router';
import { Home, Calendar, User, LogOut } from 'lucide-react';

export function ClientLayout() {
  const location = useLocation();

  const links = [
    { to: '/dashboard', icon: Home, label: 'Início' },
    { to: '/schedule', icon: Calendar, label: 'Reuniões' },
    { to: '/profile', icon: User, label: 'Meu Perfil' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">JW</div>
            <span className="font-semibold text-gray-900 hidden sm:block">Minha Congregação</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:block">Olá, Irmão Silva</span>
            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
               <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="User" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <Outlet />
      </main>

      <nav className="bg-white border-t border-gray-200 fixed bottom-0 w-full md:hidden z-50 pb-safe">
        <div className="flex justify-around items-center h-16">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link 
                key={link.to} 
                to={link.to}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      {/* Spacer for bottom nav on mobile */}
      <div className="h-16 md:hidden" />
    </div>
  );
}
