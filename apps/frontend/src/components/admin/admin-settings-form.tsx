import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AdminSettingsForm() {
  const [maintenance, setMaintenance] = useState(false);
  const [maxUploadMb, setMaxUploadMb] = useState('25');
  const [sessionTtl, setSessionTtl] = useState('7d');

  return (
    <div className="grid max-w-2xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Values are local-only until connected to the admin API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3">
            <Checkbox
              id="maint"
              checked={maintenance}
              onCheckedChange={(c) => setMaintenance(!!c)}
            />
            <Label htmlFor="maint" className="cursor-pointer font-normal">
              Maintenance mode (block non-admin sign-in)
            </Label>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="upload">Max upload size (MB)</Label>
            <Input
              id="upload"
              type="number"
              min={1}
              value={maxUploadMb}
              onChange={(e) => setMaxUploadMb(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ttl">Session TTL label</Label>
            <Input id="ttl" value={sessionTtl} onChange={(e) => setSessionTtl(e.target.value)} />
          </div>
          <Button type="button" onClick={() => undefined}>
            Save changes (mock)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
