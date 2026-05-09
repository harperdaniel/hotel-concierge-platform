import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { Building2, LogOut } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-5 border-b">
          <Link to="/dashboard" className="text-xl font-bold text-gray-900">
            🏨 Concierge
          </Link>
          <p className="text-xs text-gray-400 mt-1">{user?.name}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link
            to="/dashboard"
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
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
