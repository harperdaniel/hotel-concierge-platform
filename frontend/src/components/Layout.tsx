import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { Building2, LogOut, Menu, X } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white border-b z-30 flex items-center justify-between px-4 h-14">
        <Link to="/dashboard" className="text-lg font-bold text-gray-900">
          🏨 Concierge
        </Link>
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          className="p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (drawer on mobile, fixed on desktop) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 w-64 bg-white border-r flex flex-col z-50 transform transition-transform duration-200 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <Link to="/dashboard" className="text-xl font-bold text-gray-900" onClick={closeSidebar}>
              🏨 Concierge
            </Link>
            <p className="text-xs text-gray-400 mt-1">{user?.name}</p>
          </div>
          <button
            onClick={closeSidebar}
            aria-label="Close menu"
            className="md:hidden p-1 -mr-1 text-gray-400 hover:text-gray-600"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link
            to="/dashboard"
            onClick={closeSidebar}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
              isActive('/dashboard')
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Building2 size={18} />
            Hotels
          </Link>
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 w-full transition"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="max-w-6xl mx-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
