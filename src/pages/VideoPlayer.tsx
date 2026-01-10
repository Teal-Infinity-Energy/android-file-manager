import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ShortcutPlugin from '@/plugins/ShortcutPlugin';

const VideoPlayer = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [playbackSrc, setPlaybackSrc] = useState<string | null>(null);
  
  const videoUri = searchParams.get('uri');
  const mimeType = searchParams.get('type') || 'video/mp4';

  useEffect(() => {
    console.log('[VideoPlayer] Mounted with URI:', videoUri, 'Type:', mimeType);

    if (!videoUri) {
      setError('No video URI provided');
      return;
    }

    // Try to resolve content:// URIs to a file path for better WebView compatibility.
    const resolve = async () => {
      try {
        // Default: use the raw URI
        let src = videoUri;

        if (videoUri.startsWith('content://')) {
          const resolved = await ShortcutPlugin.resolveContentUri({ contentUri: videoUri });
          console.log('[VideoPlayer] resolveContentUri result:', resolved);

          if (resolved?.success && resolved.filePath) {
            const fileUri = resolved.filePath.startsWith('file://')
              ? resolved.filePath
              : `file://${resolved.filePath}`;
            src = Capacitor.convertFileSrc(fileUri);
          }
        } else if (videoUri.startsWith('file://') || videoUri.startsWith('/')) {
          const fileUri = videoUri.startsWith('file://') ? videoUri : `file://${videoUri}`;
          src = Capacitor.convertFileSrc(fileUri);
        }

        setPlaybackSrc(src);
      } catch (e) {
        console.warn('[VideoPlayer] Failed to resolve video URI, using raw URI', e);
        setPlaybackSrc(videoUri);
      }
    };

    resolve();
  }, [videoUri, mimeType]);

  const handleBack = () => {
    navigate('/');
  };

  const handleVideoError = () => {
    console.error('[VideoPlayer] Video playback error');
    setError('Unable to play this video. The file may be corrupted or in an unsupported format.');
  };

  if (error || !videoUri || !playbackSrc) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Cannot Play Video
          </h2>
          <p className="text-muted-foreground mb-6">
            {error || 'No video URI provided'}
          </p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header with back button */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <Button 
          onClick={handleBack} 
          variant="ghost" 
          size="icon"
          className="text-white hover:bg-white/20"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
      </header>

      {/* Video player */}
      <div className="flex-1 flex items-center justify-center">
        <video
          src={playbackSrc}
          className="max-w-full max-h-full w-full h-full object-contain"
          controls
          autoPlay
          playsInline
          onError={handleVideoError}
        >
          <source src={playbackSrc} type={mimeType} />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
};

export default VideoPlayer;
