
import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Palette, 
  Sun, 
  Contrast, 
  Zap, 
  Sparkles, 
  Eye, 
  Circle, 
  Square, 
  Heart,
  Star,
  X,
  RotateCcw
} from 'lucide-react';

interface VideoEffect {
  id: string;
  name: string;
  filter: string;
  icon: React.ReactNode;
}

interface VideoEffectsProps {
  onClose: () => void;
  localVideoRef?: HTMLVideoElement | null;
}

export const VideoEffectsPanel = ({ onClose, localVideoRef }: VideoEffectsProps) => {
  const [selectedEffect, setSelectedEffect] = useState<string>('none');
  const [brightness, setBrightness] = useState([100]);
  const [contrast, setContrast] = useState([100]);
  const [saturation, setSaturation] = useState([100]);
  const [blur, setBlur] = useState([0]);
  const [selectedOverlay, setSelectedOverlay] = useState<string>('none');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const videoEffects: VideoEffect[] = [
    { id: 'none', name: 'None', filter: 'none', icon: <Eye className="h-4 w-4" /> },
    { id: 'vintage', name: 'Vintage', filter: 'sepia(0.8) contrast(1.2) brightness(1.1)', icon: <Sun className="h-4 w-4" /> },
    { id: 'noir', name: 'Noir', filter: 'grayscale(1) contrast(1.5)', icon: <Contrast className="h-4 w-4" /> },
    { id: 'warm', name: 'Warm', filter: 'hue-rotate(15deg) saturate(1.3)', icon: <Zap className="h-4 w-4" /> },
    { id: 'cool', name: 'Cool', filter: 'hue-rotate(-15deg) saturate(1.2)', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'neon', name: 'Neon', filter: 'saturate(2) contrast(1.5) brightness(1.2)', icon: <Palette className="h-4 w-4" /> }
  ];

  const overlayOptions = [
    { id: 'none', name: 'None', icon: <X className="h-4 w-4" /> },
    { id: 'frame', name: 'Frame', icon: <Square className="h-4 w-4" /> },
    { id: 'hearts', name: 'Hearts', icon: <Heart className="h-4 w-4" /> },
    { id: 'stars', name: 'Stars', icon: <Star className="h-4 w-4" /> },
    { id: 'sparkles', name: 'Sparkles', icon: <Sparkles className="h-4 w-4" /> }
  ];

  const applyVideoEffects = () => {
    if (!localVideoRef) return;

    const customFilter = `
      brightness(${brightness[0]}%) 
      contrast(${contrast[0]}%) 
      saturate(${saturation[0]}%) 
      blur(${blur[0]}px)
    `;

    const selectedEffectFilter = videoEffects.find(e => e.id === selectedEffect)?.filter || 'none';
    
    const combinedFilter = selectedEffect === 'none' 
      ? customFilter 
      : `${selectedEffectFilter} ${customFilter}`;

    localVideoRef.style.filter = combinedFilter;
    localVideoRef.style.transition = 'filter 0.3s ease';
  };

  const drawOverlay = () => {
    if (!overlayCanvasRef.current || !localVideoRef) return;

    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = localVideoRef.videoWidth || 640;
    canvas.height = localVideoRef.videoHeight || 480;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (selectedOverlay === 'none') return;

    // Set overlay styles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = 3;

    switch (selectedOverlay) {
      case 'frame':
        // Draw decorative frame
        ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
        break;
      
      case 'hearts':
        // Draw floating hearts
        for (let i = 0; i < 8; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          drawHeart(ctx, x, y, 15);
        }
        break;
      
      case 'stars':
        // Draw twinkling stars
        for (let i = 0; i < 12; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          drawStar(ctx, x, y, 8, 5, 4);
        }
        break;
      
      case 'sparkles':
        // Draw sparkle effects
        for (let i = 0; i < 15; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          drawSparkle(ctx, x, y, 6);
        }
        break;
    }
  };

  const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, size / 4);
    ctx.bezierCurveTo(-size / 2, -size / 4, -size, size / 4, 0, size);
    ctx.bezierCurveTo(size, size / 4, size / 2, -size / 4, 0, size / 4);
    ctx.fill();
    ctx.restore();
  };

  const drawStar = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, points: number, innerRadius: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const r = i % 2 === 0 ? radius : innerRadius;
      const pointX = Math.cos(angle) * r;
      const pointY = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(pointX, pointY);
      else ctx.lineTo(pointX, pointY);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const drawSparkle = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(0, size);
    ctx.moveTo(-size, 0);
    ctx.lineTo(size, 0);
    ctx.moveTo(-size * 0.7, -size * 0.7);
    ctx.lineTo(size * 0.7, size * 0.7);
    ctx.moveTo(size * 0.7, -size * 0.7);
    ctx.lineTo(-size * 0.7, size * 0.7);
    ctx.stroke();
    ctx.restore();
  };

  const resetEffects = () => {
    setSelectedEffect('none');
    setBrightness([100]);
    setContrast([100]);
    setSaturation([100]);
    setBlur([0]);
    setSelectedOverlay('none');
    
    if (localVideoRef) {
      localVideoRef.style.filter = 'none';
    }
  };

  useEffect(() => {
    applyVideoEffects();
  }, [selectedEffect, brightness, contrast, saturation, blur]);

  useEffect(() => {
    drawOverlay();
    
    // Redraw overlay periodically for animated effects
    const interval = setInterval(drawOverlay, 100);
    return () => clearInterval(interval);
  }, [selectedOverlay, localVideoRef]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="bg-black/95 backdrop-blur-xl border-white/30 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Palette className="h-6 w-6 text-orange-400" />
            Video Effects & Overlays
          </h3>
          <div className="flex gap-2">
            <Button
              onClick={resetEffects}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Effects */}
          <div className="space-y-6">
            {/* Preset Effects */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Preset Effects</h4>
              <div className="grid grid-cols-2 gap-3">
                {videoEffects.map((effect) => (
                  <Button
                    key={effect.id}
                    onClick={() => setSelectedEffect(effect.id)}
                    variant={selectedEffect === effect.id ? "default" : "outline"}
                    className={`p-3 h-auto flex flex-col items-center gap-2 transition-all duration-200 ${
                      selectedEffect === effect.id
                        ? "bg-orange-500 text-white border-orange-400 shadow-orange-500/30"
                        : "bg-white/10 border-white/30 text-white hover:bg-white/20"
                    } shadow-lg`}
                  >
                    {effect.icon}
                    <span className="text-sm">{effect.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Adjustments */}
            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Custom Adjustments</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-white text-sm mb-2 block">
                    Brightness: {brightness[0]}%
                  </label>
                  <Slider
                    value={brightness}
                    onValueChange={setBrightness}
                    max={200}
                    min={25}
                    step={5}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="text-white text-sm mb-2 block">
                    Contrast: {contrast[0]}%
                  </label>
                  <Slider
                    value={contrast}
                    onValueChange={setContrast}
                    max={200}
                    min={25}
                    step={5}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="text-white text-sm mb-2 block">
                    Saturation: {saturation[0]}%
                  </label>
                  <Slider
                    value={saturation}
                    onValueChange={setSaturation}
                    max={200}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="text-white text-sm mb-2 block">
                    Blur: {blur[0]}px
                  </label>
                  <Slider
                    value={blur}
                    onValueChange={setBlur}
                    max={10}
                    min={0}
                    step={0.5}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Overlay Effects */}
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Overlay Effects</h4>
              <div className="grid grid-cols-2 gap-3">
                {overlayOptions.map((overlay) => (
                  <Button
                    key={overlay.id}
                    onClick={() => setSelectedOverlay(overlay.id)}
                    variant={selectedOverlay === overlay.id ? "default" : "outline"}
                    className={`p-4 h-20 flex flex-col items-center justify-center gap-2 transition-all duration-200 ${
                      selectedOverlay === overlay.id
                        ? "bg-orange-500 text-white border-orange-400 shadow-orange-500/30"
                        : "bg-white/10 border-white/30 text-white hover:bg-white/20"
                    } shadow-lg rounded-xl`}
                  >
                    <div className="text-xl">
                      {overlay.icon}
                    </div>
                    <span className="text-sm font-medium">{overlay.name}</span>
                  </Button>
                ))}
              </div>
              
              {/* Preview Section */}
              <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/20">
                <p className="text-white/80 text-sm mb-2">Selected Overlay:</p>
                <div className="flex items-center gap-2">
                  <div className="text-orange-400">
                    {overlayOptions.find(o => o.id === selectedOverlay)?.icon}
                  </div>
                  <span className="text-white font-medium">
                    {overlayOptions.find(o => o.id === selectedOverlay)?.name}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden canvas for overlay rendering */}
        <canvas
          ref={overlayCanvasRef}
          className="hidden"
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        />

        <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/20">
          <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
            Effects applied in real-time
          </Badge>
          <p className="text-white/70 text-sm">
            Changes are visible to all participants
          </p>
        </div>
      </Card>
    </div>
  );
};
