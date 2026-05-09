import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { listHotels, type Hotel } from '../lib/api';
import { Building2, Plus, Utensils, BookOpen, ClipboardList } from 'lucide-react';

export default function Dashboard() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listHotels()
      .then((res) => setHotels(res.hotels))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hotels</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your hotel properties and their concierge configuration
          </p>
        </div>
        <Link
          to="/hotels/new"
          className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium w-full sm:w-auto"
        >
          <Plus size={18} />
          Add Hotel
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : hotels.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-medium text-gray-600">No hotels yet</h2>
          <p className="text-sm text-gray-400 mt-1 mb-4">
            Add your first hotel to get started
          </p>
          <Link
            to="/hotels/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            <Plus size={18} />
            Add Hotel
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {hotels.map((hotel) => (
            <Link
              key={hotel.id}
              to={`/hotels/${hotel.id}`}
              className="bg-white rounded-xl border p-6 hover:shadow-md transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900">{hotel.name}</h2>
                  {hotel.address && (
                    <p className="text-sm text-gray-500">{hotel.address}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
                  {hotel._count && (
                    <>
                      <span className="flex items-center gap-1" title="Menu items">
                        <Utensils size={14} /> {hotel._count.menuItems}
                      </span>
                      <span className="flex items-center gap-1" title="Knowledge entries">
                        <BookOpen size={14} /> {hotel._count.knowledgeEntries}
                      </span>
                      <span className="flex items-center gap-1" title="Bookings">
                        <ClipboardList size={14} /> {hotel._count.bookings}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
