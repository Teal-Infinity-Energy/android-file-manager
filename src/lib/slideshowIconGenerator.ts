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
    return thumbnails[0] || '';
  }

  // Fill with background color
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, size, size);

  const gap = 4;
  const count = thumbnails.length;

  // Determine layout based on image count
  type TilePosition = { x: number; y: number; width: number; height: number };
  let positions: TilePosition[];

  if (count === 2) {
    // Vertical stack: two images, full width, half height each
    const tileHeight = (size - gap) / 2;
    positions = [
      { x: 0, y: 0, width: size, height: tileHeight },
      { x: 0, y: tileHeight + gap, width: size, height: tileHeight },
    ];
  } else if (count === 3) {
    // 1 top (full width) + 2 bottom (split)
    const topHeight = (size - gap) / 2;
    const bottomTileWidth = (size - gap) / 2;
    positions = [
      { x: 0, y: 0, width: size, height: topHeight },
      { x: 0, y: topHeight + gap, width: bottomTileWidth, height: topHeight },
      { x: bottomTileWidth + gap, y: topHeight + gap, width: bottomTileWidth, height: topHeight },
    ];
  } else {
    // 4+ images: standard 2x2 grid
    const tileSize = (size - gap) / 2;
    positions = [
      { x: 0, y: 0, width: tileSize, height: tileSize },
      { x: tileSize + gap, y: 0, width: tileSize, height: tileSize },
      { x: 0, y: tileSize + gap, width: tileSize, height: tileSize },
      { x: tileSize + gap, y: tileSize + gap, width: tileSize, height: tileSize },
    ];
  }

  // Load and draw each image
  const drawPromises = thumbnails.slice(0, positions.length).map((thumbnail, index) => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const pos = positions[index];
        
        // Draw with cover-style cropping (center crop)
        const imgAspect = img.width / img.height;
        const tileAspect = pos.width / pos.height;
        let srcX = 0;
        let srcY = 0;
        let srcWidth = img.width;
        let srcHeight = img.height;
        
        if (imgAspect > tileAspect) {
          // Image is wider than tile - crop sides
          srcWidth = img.height * tileAspect;
          srcX = (img.width - srcWidth) / 2;
        } else if (imgAspect < tileAspect) {
          // Image is taller than tile - crop top/bottom
          srcHeight = img.width / tileAspect;
          srcY = (img.height - srcHeight) / 2;
        }
        
        ctx.drawImage(
          img,
          srcX, srcY, srcWidth, srcHeight,
          pos.x, pos.y, pos.width, pos.height
        );
        resolve();
      };
      
      img.onerror = () => {
        console.warn('[SlideshowIconGenerator] Failed to load image:', index);
        const pos = positions[index];
        ctx.fillStyle = '#2d2d44';
        ctx.fillRect(pos.x, pos.y, pos.width, pos.height);
        resolve();
      };
      
      // Normalize thumbnail to data URL if needed
      if (thumbnail.startsWith('data:')) {
        img.src = thumbnail;
      } else if (thumbnail.startsWith('blob:')) {
        img.src = thumbnail;
      } else {
        img.src = `data:image/jpeg;base64,${thumbnail}`;
      }
    });
  });

  await Promise.all(drawPromises);

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
