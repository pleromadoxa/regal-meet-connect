
import { AdminPanel } from '@/components/AdminPanel';
import { useAdmin } from '@/hooks/useAdmin';
import { useEffect } from 'react';

const AdminDashboard = () => {
  const { isAdmin, loading, logAction } = useAdmin();

  useEffect(() => {
    if (isAdmin) {
      logAction('admin_dashboard_accessed');
    }
  }, [isAdmin, logAction]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-orange-200">You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  return <AdminPanel />;
};

export default AdminDashboard;
