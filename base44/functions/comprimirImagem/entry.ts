import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    
    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const ext = fileName.split('.').pop();
    
    // Apenas imagens
    const imagemExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!imagemExts.includes(ext)) {
      return Response.json({ 
        compressed: false, 
        reason: 'not_image',
        original_size: file.size 
      });
    }

    // Ler bytes
    const arrayBuffer = await file.arrayBuffer();
    const originalSize = arrayBuffer.byteLength;

    // Se já é pequeno (<100KB), não comprimir
    if (originalSize < 100 * 1024) {
      return Response.json({ 
        compressed: false, 
        reason: 'already_small',
        original_size: originalSize 
      });
    }

    // Compressão via Canvas (reduz qualidade JPEG/PNG)
    const blob = new Blob([arrayBuffer], { type: file.type });
    const bitmap = await createImageBitmap(blob);
    
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    
    // Comprimir para WebP (melhor compressão)
    const compressedBlob = await canvas.convertToBlob({
      type: 'image/webp',
      quality: 0.85 // 85% qualidade = ótimo balanço
    });

    const compressedSize = compressedBlob.size;
    const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

    // Upload arquivo comprimido
    const newFileName = fileName.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
    const compressedFile = new File([compressedBlob], newFileName, { type: 'image/webp' });
    
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ 
      file: compressedFile 
    });

    console.log(`[Compression] ${fileName}: ${originalSize}B → ${compressedSize}B (${savings}% saved)`);

    return Response.json({
      compressed: true,
      file_url,
      original_size: originalSize,
      compressed_size: compressedSize,
      savings_percent: parseFloat(savings),
      format: 'webp'
    });
  } catch (error) {
    console.error('[Compression Error]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});