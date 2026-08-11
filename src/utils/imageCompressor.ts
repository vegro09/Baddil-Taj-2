/**
 * BADDIL Mobile-First Production-Grade Image Compression Utility.
 * Compressed images are resized to fit within 800x800 and converted to WebP format,
 * ensuring files are well under 500KB (typically 30KB - 150KB) to optimize storage,
 * reduce network payload, and improve page load speed on mobile devices.
 */

export function compressImageToWebP(
  fileOrBase64: File | string,
  quality: number = 0.6,
  maxWidth: number = 800,
  maxHeight: number = 800
): Promise<{ base64: string; blob: Blob; file?: File; sizeInKb: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    // Setup source depending on type
    if (typeof fileOrBase64 === 'string') {
      img.src = fileOrBase64;
    } else {
      img.src = URL.createObjectURL(fileOrBase64);
    }

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio while constraining to bounds
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        // Draw image onto canvas
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Export to WebP format
        const base64 = canvas.toDataURL('image/webp', quality);
        
        // Convert to Blob to measure actual size & for native uploads
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas toBlob failed'));
              return;
            }

            const sizeInKb = blob.size / 1024;
            let finalFile: File | undefined;
            
            if (fileOrBase64 instanceof File) {
              // Create an optimized WebP File
              const originalName = fileOrBase64.name.substring(0, fileOrBase64.name.lastIndexOf('.')) || fileOrBase64.name;
              finalFile = new File([blob], `${originalName}.webp`, { type: 'image/webp' });
            }

            // Clean up object URL if we created one
            if (!(typeof fileOrBase64 === 'string')) {
              URL.revokeObjectURL(img.src);
            }

            resolve({
              base64,
              blob,
              file: finalFile,
              sizeInKb
            });
          },
          'image/webp',
          quality
        );
      } catch (err) {
        if (!(typeof fileOrBase64 === 'string')) {
          URL.revokeObjectURL(img.src);
        }
        reject(err);
      }
    };

    img.onerror = (err) => {
      if (!(typeof fileOrBase64 === 'string')) {
        URL.revokeObjectURL(img.src);
      }
      reject(new Error('Failed to load image for compression'));
    };
  });
}
