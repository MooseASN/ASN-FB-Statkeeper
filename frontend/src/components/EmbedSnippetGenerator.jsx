import { useState } from 'react';
import { Copy, Code, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

/**
 * EmbedSnippetGenerator - Generate embeddable HTML snippets for live stats
 * Works for basketball, football, and baseball games
 * 
 * @param {boolean} open - Dialog open state
 * @param {function} onOpenChange - Dialog state change handler
 * @param {string} shareCode - The game's share code
 * @param {string} sport - 'basketball' | 'football' | 'baseball'
 * @param {string} gameTitle - Optional game title for display
 */
export default function EmbedSnippetGenerator({ 
  open, 
  onOpenChange, 
  shareCode, 
  sport = 'basketball',
  gameTitle = 'Live Game Stats'
}) {
  const [embedWidth, setEmbedWidth] = useState('800');
  const [embedHeight, setEmbedHeight] = useState('300');
  const [copied, setCopied] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  
  // Generate embed URLs based on sport
  const baseUrl = window.location.origin;
  const embedUrl = `${baseUrl}/embed/${shareCode}`;
  const liveStatsUrl = sport === 'baseball' 
    ? `${baseUrl}/baseball/${shareCode}/stats`
    : `${baseUrl}/live/${shareCode}`;
  
  // Standard iframe embed code
  const iframeCode = `<iframe 
  src="${embedUrl}?w=${embedWidth}&h=${embedHeight}" 
  width="${embedWidth}" 
  height="${embedHeight}" 
  frameborder="0" 
  style="max-width:100%; border-radius:8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" 
  allowfullscreen
  title="${gameTitle}"
></iframe>`;

  // Responsive embed code with script
  const responsiveCode = `<!-- StatMoose Live Stats Widget -->
<div id="statmoose-widget-${shareCode}" style="width:100%; max-width:${embedWidth}px; margin:0 auto;"></div>
<script>
(function() {
  var container = document.getElementById('statmoose-widget-${shareCode}');
  var iframe = document.createElement('iframe');
  iframe.src = '${embedUrl}?w=' + Math.min(container.offsetWidth, ${embedWidth}) + '&h=${embedHeight}';
  iframe.style.width = '100%';
  iframe.style.height = '${embedHeight}px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '8px';
  iframe.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
  iframe.setAttribute('allowfullscreen', 'true');
  iframe.setAttribute('title', '${gameTitle}');
  container.appendChild(iframe);
  
  // Auto-resize on window resize
  window.addEventListener('resize', function() {
    iframe.src = '${embedUrl}?w=' + Math.min(container.offsetWidth, ${embedWidth}) + '&h=${embedHeight}';
  });
})();
</script>`;

  // Simple link for sharing
  const linkCode = `<a href="${liveStatsUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:8px; padding:12px 24px; background:#000; color:#fff; border-radius:8px; text-decoration:none; font-family:system-ui,sans-serif; font-weight:600;">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
  View Live Stats
</a>`;

  const copyToClipboard = (code, isScript = false) => {
    navigator.clipboard.writeText(code);
    if (isScript) {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    toast.success('Embed code copied to clipboard!');
  };

  const presetSizes = [
    { label: 'Full Width', width: '1200', height: '300' },
    { label: 'Medium', width: '800', height: '300' },
    { label: 'Small', width: '400', height: '250' },
    { label: 'Compact', width: '300', height: '200' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Embed Live Stats
          </DialogTitle>
          <DialogDescription>
            Add live game stats to your website with one of these embed options.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Live Stats Link - At the TOP for easy access */}
          <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold text-orange-800">Live Stats Output Link</Label>
                <p className="text-xs text-orange-600 mt-1 font-mono break-all">{liveStatsUrl}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  onClick={() => {
                    navigator.clipboard.writeText(liveStatsUrl);
                    toast.success('Live stats link copied!');
                  }}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => window.open(liveStatsUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open
                </Button>
              </div>
            </div>
          </div>

          {/* Size Controls */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Widget Size</Label>
            <div className="flex flex-wrap gap-2">
              {presetSizes.map((preset) => (
                <Button
                  key={preset.label}
                  variant={embedWidth === preset.width && embedHeight === preset.height ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setEmbedWidth(preset.width);
                    setEmbedHeight(preset.height);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Width:</Label>
                <Input
                  type="number"
                  value={embedWidth}
                  onChange={(e) => setEmbedWidth(e.target.value)}
                  className="w-20 h-8"
                />
                <span className="text-xs text-muted-foreground">px</span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Height:</Label>
                <Input
                  type="number"
                  value={embedHeight}
                  onChange={(e) => setEmbedHeight(e.target.value)}
                  className="w-20 h-8"
                />
                <span className="text-xs text-muted-foreground">px</span>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Preview</Label>
            <div 
              className="bg-zinc-100 rounded-lg p-4 overflow-hidden flex items-center justify-center"
              style={{ minHeight: '150px' }}
            >
              <div 
                className="bg-black rounded-lg flex items-center justify-center text-white text-xs"
                style={{ 
                  width: `${Math.min(parseInt(embedWidth), 600)}px`, 
                  height: `${Math.min(parseInt(embedHeight), 200)}px`,
                  transform: `scale(${Math.min(600 / parseInt(embedWidth), 1)})`
                }}
              >
                Live Stats Widget ({embedWidth}×{embedHeight})
              </div>
            </div>
          </div>

          {/* Simple Iframe Code */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Simple Embed (iframe)</Label>
            <div className="relative">
              <pre className="bg-zinc-900 text-zinc-100 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                {iframeCode}
              </pre>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(iframeCode)}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Responsive Code */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Responsive Embed (with auto-resize)</Label>
            <div className="relative">
              <pre className="bg-zinc-900 text-zinc-100 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap max-h-48">
                {responsiveCode}
              </pre>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(responsiveCode, true)}
              >
                {copiedScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Link Button Code */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Link Button</Label>
            <div className="relative">
              <pre className="bg-zinc-900 text-zinc-100 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                {linkCode}
              </pre>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(linkCode)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="mt-2" dangerouslySetInnerHTML={{ __html: linkCode }} />
          </div>

          {/* Direct Link */}
          <div className="flex items-center justify-between p-3 bg-zinc-100 rounded-lg">
            <div>
              <Label className="text-sm font-medium">Direct Link</Label>
              <p className="text-xs text-muted-foreground mt-1 font-mono">{liveStatsUrl}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(liveStatsUrl, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Open
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
