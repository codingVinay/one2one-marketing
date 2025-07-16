
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

const ClientDetail = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to user management after a brief delay
    const timer = setTimeout(() => {
      navigate('/user-management');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Page Moved</h2>
          <p className="text-gray-600 mb-6">
            Client details are now managed through the User Management system. 
            You'll be redirected automatically in a few seconds.
          </p>
          <div className="space-y-2">
            <Button 
              onClick={() => navigate('/user-management')} 
              className="w-full"
            >
              Go to User Management
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')} 
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDetail;
