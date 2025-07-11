
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface ClientSocialLinksProps {
  platforms: string[];
  socialLinks: Record<string, string>;
  onSocialLinkChange: (platform: string, value: string) => void;
}

const ClientSocialLinks = ({ platforms, socialLinks, onSocialLinkChange }: ClientSocialLinksProps) => {
  return (
    <div className="space-y-2">
      <Label>Social Media Profile Links</Label>
      <div className="grid grid-cols-1 gap-3">
        {platforms.map((platform) => (
          <div key={platform} className="space-y-1">
            <Label htmlFor={`${platform}_link`} className="text-sm capitalize">
              {platform} Profile URL
            </Label>
            <Input
              id={`${platform}_link`}
              value={socialLinks[platform] || ''}
              onChange={(e) => onSocialLinkChange(platform, e.target.value)}
              placeholder={`https://${platform}.com/username`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientSocialLinks;
