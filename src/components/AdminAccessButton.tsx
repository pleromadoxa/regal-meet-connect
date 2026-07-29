
import { Button } from '@/components/ui/button';
import { useAdmin } from '@/hooks/useAdmin';
import { Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminAccessButton = () => {
  const { isAdmin, loading } = useAdmin();

  if (loading || !isAdmin) {
    return null;
  }

  return (
    <Link to="/admin" className="no-underline">
      <Button 
        variant="outline" 
        className="bg-white/10 backdrop-blur-sm border-orange-400 text-orange-200 hover:bg-orange-500/20 hover:text-white hover:border-orange-300 transition-all duration-200"
      >
        <Shield className="h-4 w-4 mr-2" />
        Admin Dashboard
      </Button>
    </Link>
  );
};
