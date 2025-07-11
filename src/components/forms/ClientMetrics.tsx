
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface ClientMetricsProps {
  monthlyPosts: number;
  followers: number;
  onChange: (field: string, value: number) => void;
}

const ClientMetrics = ({ monthlyPosts, followers, onChange }: ClientMetricsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="monthly_posts">Monthly Posts</Label>
        <Input
          id="monthly_posts"
          type="number"
          min="0"
          value={monthlyPosts}
          onChange={(e) => onChange('monthly_posts', parseInt(e.target.value) || 0)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="followers">Followers</Label>
        <Input
          id="followers"
          type="number"
          min="0"
          value={followers}
          onChange={(e) => onChange('followers', parseInt(e.target.value) || 0)}
        />
      </div>
    </div>
  );
};

export default ClientMetrics;
