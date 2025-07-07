
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, Video, ChevronDown } from 'lucide-react';

interface DeviceSelectorProps {
  type: 'audio' | 'video';
  currentDeviceId?: string;
  onDeviceChange: (deviceId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const DeviceSelector = ({ 
  type, 
  currentDeviceId, 
  onDeviceChange, 
  isOpen, 
  onToggle 
}: DeviceSelectorProps) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    const getDevices = async () => {
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const filteredDevices = deviceList.filter(device => 
          type === 'audio' ? device.kind === 'audioinput' : device.kind === 'videoinput'
        );
        setDevices(filteredDevices);
      } catch (error) {
        console.error('Error getting devices:', error);
      }
    };

    if (isOpen) {
      getDevices();
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  return (
    <Card className="absolute bottom-full mb-2 left-0 bg-black/90 backdrop-blur-xl border-white/20 p-3 shadow-2xl min-w-[250px] z-50">
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-white text-sm font-medium">
          {type === 'audio' ? <Mic className="h-4 w-4" /> : <Video className="h-4 w-4" />}
          <span>{type === 'audio' ? 'Microphone' : 'Camera'}</span>
        </div>
        <Select value={currentDeviceId} onValueChange={onDeviceChange}>
          <SelectTrigger className="bg-white/10 border-white/20 text-white">
            <SelectValue placeholder={`Select ${type}`} />
          </SelectTrigger>
          <SelectContent className="bg-black/90 border-white/20">
            {devices.map((device) => (
              <SelectItem 
                key={device.deviceId} 
                value={device.deviceId}
                className="text-white hover:bg-white/10"
              >
                {device.label || `${type} ${device.deviceId.slice(0, 8)}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
};
