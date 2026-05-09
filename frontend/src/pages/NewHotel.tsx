import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { createHotel } from '../lib/api';
import { ArrowLeft, Plus } from 'lucide-react';

export default function NewHotel() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await createHotel({ name, address, phone, email });
      navigate(`/hotels/${res.hotel.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create hotel');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <Link to="/dashboard" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={16} /> Back to hotels
      </Link>

      <form onSubmit={handleSubmit} className="max-w-lg bg-white rounded-xl border p-4 sm:p-8 space-y-5">
        <h1 className="text-xl font-bold text-gray-900">Add Hotel</h1>

        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Grand Oslo Hotel"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Karl Johans gate 1, Oslo"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="+47 22 00 00 00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="hello@grandoslo.no"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          {saving ? 'Creating...' : 'Create Hotel'}
        </button>
      </form>
    </Layout>
  );
}
