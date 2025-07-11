
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface ClientPlatformsProps {
  platforms: string[];
  selectedPlatforms: string[];
  onPlatformChange: (platform: string, checked: boolean) => void;
}

const ClientPlatforms = ({ platforms, selectedPlatforms, onPlatformChange }: ClientPlatformsProps) => {
  return (
    <div className="space-y-2">
      <Label>Platforms</Label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {platforms.map((platform) => (
          <div key={platform} className="flex items-center space-x-2">
            <Checkbox
              id={platform}
              checked={selectedPlatforms.includes(platform)}
              onCheckedChange={(checked) => 
                onPlatformChange(platform, checked as boolean)
              }
            />
            <Label htmlFor={platform} className="capitalize">
              {platform}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientPlatforms;
