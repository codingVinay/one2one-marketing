
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';

interface ClientPackageSelectionProps {
  selectedPackageId: string | null;
  onPackageChange: (packageId: string | null) => void;
}

const ClientPackageSelection = ({ selectedPackageId, onPackageChange }: ClientPackageSelectionProps) => {
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const selectedPackage = packages.find(pkg => pkg.id === selectedPackageId);

  const handleValueChange = (value: string) => {
    if (value === 'no-package') {
      onPackageChange(null);
    } else {
      onPackageChange(value);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="package">Package Subscription</Label>
        <Select 
          value={selectedPackageId || 'no-package'} 
          onValueChange={handleValueChange}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a package" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no-package">No Package</SelectItem>
            {packages.map((pkg) => (
              <SelectItem key={pkg.id} value={pkg.id}>
                {pkg.name} - ${pkg.price}/month
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedPackage && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h4 className="font-medium text-blue-800 mb-2">{selectedPackage.name}</h4>
            <p className="text-sm text-blue-600 mb-2">{selectedPackage.description}</p>
            <div className="text-sm text-blue-600">
              <p>Monthly Posts: {selectedPackage.monthly_posts}</p>
              <p>Price: ${selectedPackage.price}/month</p>
              {selectedPackage.platforms && (
                <p>Platforms: {selectedPackage.platforms.join(', ')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientPackageSelection;
