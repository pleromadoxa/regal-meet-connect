import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { X, Image as ImageIcon, Sparkles, Palette, Wind } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VirtualBackgroundPanelProps {
  onClose: () => void;
  videoElement?: HTMLVideoElement | null;
  canvasElement?: HTMLCanvasElement | null;
}

export const VirtualBackgroundPanel = ({
  onClose,
  videoElement,
  canvasElement
}: VirtualBackgroundPanelProps) => {
  const [selectedEffect, setSelectedEffect] = useState<string>('none');
  const [blurIntensity, setBlurIntensity] = useState(10);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const presetBackgrounds = [
    { id: 'office', name: 'Office', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 'sunset', name: 'Sunset', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { id: 'ocean', name: 'Ocean', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { id: 'forest', name: 'Forest', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
    { id: 'minimal', name: 'Minimal', gradient: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' },
    { id: 'dark', name: 'Dark', gradient: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' }
  ];

  const applyEffects = () => {
    if (!videoElement || !canvasElement) return;

    const ctx = canvasElement.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const renderFrame = () => {
      if (!videoElement || videoElement.paused || videoElement.ended) return;

      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;

      // Draw video frame
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      
      // Apply background effect
      if (selectedEffect === 'blur') {
        ctx.filter += ` blur(${blurIntensity}px)`;
        ctx.drawImage(videoElement, 0, 0);
      } else if (selectedEffect !== 'none' && selectedEffect !== 'custom') {
        const bg = presetBackgrounds.find(b => b.id === selectedEffect);
        if (bg) {
          // Draw gradient background
          const gradient = ctx.createLinearGradient(0, 0, canvasElement.width, canvasElement.height);
          const colors = bg.gradient.match(/hsl\([^)]+\)/g) || [];
          if (colors.length >= 2) {
            gradient.addColorStop(0, colors[0]);
            gradient.addColorStop(1, colors[1]);
          }
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
        }
        // Draw video with some transparency for blend effect
        ctx.globalAlpha = 0.8;
        ctx.drawImage(videoElement, 0, 0);
        ctx.globalAlpha = 1.0;
      } else if (selectedEffect === 'custom' && backgroundImage) {
        const img = new Image();
        img.src = backgroundImage;
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvasElement.width, canvasElement.height);
          ctx.globalAlpha = 0.8;
          ctx.drawImage(videoElement, 0, 0);
          ctx.globalAlpha = 1.0;
        };
      } else {
        ctx.drawImage(videoElement, 0, 0);
      }

      requestAnimationFrame(renderFrame);
    };

    renderFrame();
  };

  useEffect(() => {
    applyEffects();
  }, [selectedEffect, blurIntensity, brightness, contrast, saturation, backgroundImage]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an image file',
        variant: 'destructive'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setBackgroundImage(e.target?.result as string);
      setSelectedEffect('custom');
      toast({
        title: 'Background Updated',
        description: 'Your custom background has been applied'
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Card className="w-full max-w-md glass-morphism border-border/40 animate-scale-in">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center text-foreground">
          <Sparkles className="h-5 w-5 mr-2 text-primary" />
          Video Effects
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Background Effects */}
        <div className="space-y-3">
          <Label className="text-foreground font-semibold flex items-center">
            <ImageIcon className="h-4 w-4 mr-2 text-primary" />
            Virtual Backgrounds
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={selectedEffect === 'none' ? 'default' : 'outline'}
              onClick={() => setSelectedEffect('none')}
              className="h-16 text-xs"
            >
              None
            </Button>
            {presetBackgrounds.map(bg => (
              <Button
                key={bg.id}
                variant={selectedEffect === bg.id ? 'default' : 'outline'}
                onClick={() => setSelectedEffect(bg.id)}
                className="h-16 text-xs relative overflow-hidden"
                style={{ background: selectedEffect === bg.id ? undefined : bg.gradient }}
              >
                <span className="relative z-10">{bg.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Blur Effect */}
        <div className="space-y-3 p-3 bg-card/50 rounded-lg border border-border/30">
          <div className="flex items-center justify-between">
            <Label className="text-foreground flex items-center">
              <Wind className="h-4 w-4 mr-2 text-primary" />
              Background Blur
            </Label>
            <Button
              variant={selectedEffect === 'blur' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedEffect(selectedEffect === 'blur' ? 'none' : 'blur')}
            >
              {selectedEffect === 'blur' ? 'On' : 'Off'}
            </Button>
          </div>
          {selectedEffect === 'blur' && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Intensity</span>
                <span>{blurIntensity}px</span>
              </div>
              <Slider
                value={[blurIntensity]}
                onValueChange={(val) => setBlurIntensity(val[0])}
                min={5}
                max={30}
                step={1}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Custom Background Upload */}
        <div className="space-y-2">
          <Label className="text-foreground">Custom Background</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Upload Image
          </Button>
        </div>

        {/* Color Adjustments */}
        <div className="space-y-4 p-3 bg-card/50 rounded-lg border border-border/30">
          <Label className="text-foreground font-semibold flex items-center">
            <Palette className="h-4 w-4 mr-2 text-primary" />
            Color Adjustments
          </Label>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Brightness</span>
                <span>{brightness}%</span>
              </div>
              <Slider
                value={[brightness]}
                onValueChange={(val) => setBrightness(val[0])}
                min={50}
                max={150}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Contrast</span>
                <span>{contrast}%</span>
              </div>
              <Slider
                value={[contrast]}
                onValueChange={(val) => setContrast(val[0])}
                min={50}
                max={150}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Saturation</span>
                <span>{saturation}%</span>
              </div>
              <Slider
                value={[saturation]}
                onValueChange={(val) => setSaturation(val[0])}
                min={0}
                max={200}
                step={1}
              />
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <Button
          variant="outline"
          onClick={() => {
            setSelectedEffect('none');
            setBlurIntensity(10);
            setBrightness(100);
            setContrast(100);
            setSaturation(100);
            setBackgroundImage(null);
          }}
          className="w-full"
        >
          Reset All Effects
        </Button>
      </CardContent>
    </Card>
  );
};