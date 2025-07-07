
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
    <Link to="/admin">
      <Button 
        variant="outline" 
        className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
      >
        <Shield className="h-4 w-4 mr-2" />
        Admin Dashboard
      </Button>
    </Link>
  );
};
