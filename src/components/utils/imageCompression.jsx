/**
 * MOBILE OPTIMIZATION: Compress imagens antes upload
 * META: Foto 12MP (8MB) → WebP 1080p (800KB) = 10x economia
 * IMPACTO: 4G upload 8MB = 12s → 800KB = 1.2s
 */

/**
 * Comprime imagem usando Canvas API
 * @param {File} file - Arquivo original
 * @param {Object} options - Configurações
 * @returns {Promise<File>} - Arquivo comprimido
 */
export async function comprimirImagem(file, options = {}) {
  const {
    maxWidth = 1080,
    maxHeight = 1080,
    quality = 0.85,
    outputFormat = 'image/webp'
  } = options;

  return new Promise((resolve, reject) => {
    // Validar tipo
    if (!file.type.startsWith('image/')) {
      resolve(file); // Não é imagem = retorna original
      return;
    }

    // Criar leitura
    const reader = new FileReader();
    
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onerror = () => reject(new Error('Falha ao carregar imagem'));
      
      img.onload = () => {
        try {
          // Calcular dimensões mantendo aspect ratio
          let { width, height } = img;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          // CRITICAL: Canvas redimensiona + comprime
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          
          // Anti-aliasing suave (qualidade médica)
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          ctx.drawImage(img, 0, 0, width, height);

          // Converter para blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Falha ao gerar blob'));
                return;
              }

              // Criar File do blob
              const fileName = file.name.replace(/\.[^.]+$/, '.webp');
              const compressedFile = new File([blob], fileName, {
                type: outputFormat,
                lastModified: Date.now()
              });

              // Calcular economia
              const economia = Math.round(((file.size - compressedFile.size) / file.size) * 100);
              
              console.log(`[imageCompression] ✅ ${file.name}:`, {
                original: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
                comprimido: `${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
                economia: `${economia}% menor`,
                dimensoes: `${width}x${height}px`
              });

              resolve(compressedFile);
            },
            outputFormat,
            quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Gerar thumbnail preview (200px WebP)
 * @param {File} file - Imagem original
 * @returns {Promise<string>} - Data URL do thumbnail
 */
export async function gerarThumbnail(file, maxSize = 200) {
  if (!file.type.startsWith('image/')) return null;

  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxSize / img.width, maxSize / img.height);
        
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        resolve(canvas.toDataURL('image/webp', 0.7));
      };
      
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };
    
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * Validar imagem médica (detectar corrupção)
 * @param {File} file
 * @returns {Promise<boolean>}
 */
export async function validarImagemMedica(file) {
  if (!file.type.startsWith('image/')) return true;

  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      // Validar dimensões mínimas (prevenir 1x1px)
      const minima = img.width >= 100 && img.height >= 100;
      resolve(minima);
    };
    
    img.onerror = () => resolve(false);
    
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = () => resolve(false);
    reader.readAsDataURL(file);
  });
}