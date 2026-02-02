/**
 * Canvas-based 2x2 grid icon generator for slideshow shortcuts.
 * Creates a composite icon from up to 4 thumbnails.
 */

/**
 * Generate a 2x2 grid icon from thumbnail images.
 * @param thumbnails Array of base64 thumbnail strings (with or without data: prefix)
 * @param size Output icon size (default 256)
 * @returns Base64 data URL of the generated icon
 */
export async function generateGridIcon(
  thumbnails: string[],
  size: number = 256
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    console.error('[SlideshowIconGenerator] Could not get canvas context');
    // Return first thumbnail as fallback
    return thumbnails[0] || '';
  }

  // Fill with background color
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, size, size);

  // Gap between tiles
  const gap = 4;
  const tileSize = (size - gap) / 2;

  // Positions for 2x2 grid
  const positions = [
    { x: 0, y: 0 },
    { x: tileSize + gap, y: 0 },
    { x: 0, y: tileSize + gap },
    { x: tileSize + gap, y: tileSize + gap },
  ];

  // Load and draw each image
  const drawPromises = thumbnails.slice(0, 4).map((thumbnail, index) => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const pos = positions[index];
        
        // Draw with cover-style cropping (center crop)
        const aspectRatio = img.width / img.height;
        let srcX = 0;
        let srcY = 0;
        let srcWidth = img.width;
        let srcHeight = img.height;
        
        if (aspectRatio > 1) {
          // Wider than tall - crop sides
          srcWidth = img.height;
          srcX = (img.width - srcWidth) / 2;
        } else if (aspectRatio < 1) {
          // Taller than wide - crop top/bottom
          srcHeight = img.width;
          srcY = (img.height - srcHeight) / 2;
        }
        
        ctx.drawImage(
          img,
          srcX, srcY, srcWidth, srcHeight,
          pos.x, pos.y, tileSize, tileSize
        );
        resolve();
      };
      
      img.onerror = () => {
        console.warn('[SlideshowIconGenerator] Failed to load image:', index);
        // Draw placeholder
        const pos = positions[index];
        ctx.fillStyle = '#2d2d44';
        ctx.fillRect(pos.x, pos.y, tileSize, tileSize);
        resolve();
      };
      
      // Normalize thumbnail to data URL if needed
      if (thumbnail.startsWith('data:')) {
        img.src = thumbnail;
      } else if (thumbnail.startsWith('blob:')) {
        img.src = thumbnail;
      } else {
        // Assume raw base64
        img.src = `data:image/jpeg;base64,${thumbnail}`;
      }
    });
  });

  await Promise.all(drawPromises);

  // If fewer than 4 images, fill remaining tiles with placeholders
  for (let i = thumbnails.length; i < 4; i++) {
    const pos = positions[i];
    ctx.fillStyle = '#2d2d44';
    ctx.fillRect(pos.x, pos.y, tileSize, tileSize);
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Generate a cover icon using the first image (fallback for grid generation).
 * @param thumbnail Base64 thumbnail string
 * @param size Output icon size (default 256)
 * @returns Base64 data URL of the icon
 */
export async function generateCoverIcon(
  thumbnail: string,
  size: number = 256
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return thumbnail;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Draw with cover-style cropping
      const aspectRatio = img.width / img.height;
      let srcX = 0;
      let srcY = 0;
      let srcWidth = img.width;
      let srcHeight = img.height;
      
      if (aspectRatio > 1) {
        srcWidth = img.height;
        srcX = (img.width - srcWidth) / 2;
      } else if (aspectRatio < 1) {
        srcHeight = img.width;
        srcY = (img.height - srcHeight) / 2;
      }
      
      ctx.drawImage(
        img,
        srcX, srcY, srcWidth, srcHeight,
        0, 0, size, size
      );
      
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    
    img.onerror = () => {
      resolve(thumbnail);
    };
    
    // Normalize thumbnail
    if (thumbnail.startsWith('data:') || thumbnail.startsWith('blob:')) {
      img.src = thumbnail;
    } else {
      img.src = `data:image/jpeg;base64,${thumbnail}`;
    }
  });
}
