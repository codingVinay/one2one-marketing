
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ClientBasicInfoProps {
  formData: {
    name: string;
    industry: string;
    email: string;
    phone: string;
    password: string;
  };
  onChange: (field: string, value: string) => void;
}

const ClientBasicInfo = ({ formData, onChange }: ClientBasicInfoProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Client Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => onChange('name', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Input
            id="industry"
            value={formData.industry}
            onChange={(e) => onChange('industry', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => onChange('email', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password *</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => onChange('password', e.target.value)}
            required
            placeholder="Password for client login"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => onChange('phone', e.target.value)}
        />
      </div>
    </div>
  );
};

export default ClientBasicInfo;
