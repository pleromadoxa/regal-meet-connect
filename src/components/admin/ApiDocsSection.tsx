import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, FileType2, BookOpen } from 'lucide-react';

const sections = [
  'Project endpoints & keys (meet.regalmesh.com / xexnw…)',
  'Authentication (email + Regal Mail SSO)',
  'Profiles & avatar upload (R2)',
  'User settings',
  'Meetings (CRUD + join validation)',
  'Scheduled meetings & invitations',
  'Lobby flow (knock / admit / deny)',
  'Participants & presence',
  'WebRTC dual signalling (web ↔ mobile)',
  'ICE / TURN configuration',
  'Media topology (mesh / SFU / host-hub)',
  'Cloudflare SFU (meeting-sfu)',
  'Plans & billing (meeting-billing)',
  'In-meeting chat / hands / reactions',
  'File sharing (meeting-r2)',
  'Recordings',
  'Captions',
  'Notifications & push',
  'Recent meetings',
  'Mobile-only (Regal Number, CALL-*, biometrics)',
  'Brand tokens (Spatial Regal)',
];

export const ApiDocsSection = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <BookOpen className="h-5 w-5 mr-2 text-orange-400" />
            API Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-orange-100/90 text-sm leading-relaxed">
            A complete, self-contained API reference for building the Regal Meeting mobile app.
            Includes Supabase URL, anon key, every table, every Realtime channel, every Edge
            Function, the full WebRTC signalling protocol, the lobby flow, color tokens, and
            mobile UX requirements. Both reading and writing data are covered (e.g. updating
            profiles, joining meetings, uploading files) using the same publishable key —
            row-level security enforces who can do what.
          </p>

          <div className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <Badge key={s} variant="outline" className="border-orange-400/40 text-orange-100 bg-orange-500/10">
                {s}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <a href="/docs/regal-meeting-api.md" download className="block">
              <Button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white">
                <FileText className="h-4 w-4 mr-2" />
                Download Markdown (.md)
                <Download className="h-4 w-4 ml-auto" />
              </Button>
            </a>
            <a href="/docs/regal-meeting-api.pdf" download className="block">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white">
                <FileType2 className="h-4 w-4 mr-2" />
                Download PDF (.pdf)
                <Download className="h-4 w-4 ml-auto" />
              </Button>
            </a>
          </div>

          <div className="text-xs text-orange-200/70 pt-2">
            Files served from <code className="text-orange-200">/docs/regal-meeting-api.md</code>
            {' '}and <code className="text-orange-200">/docs/regal-meeting-api.pdf</code>. Feed
            either file directly to an AI agent to scaffold the mobile app.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
