import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url } = await req.json();
    
    if (!file_url) {
      return Response.json({ error: 'file_url required' }, { status: 400 });
    }

    // Baixar imagem original
    const response = await fetch(file_url);
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }

    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: response.headers.get('content-type') });
    
    // Criar thumbnail (200px width mantendo aspect ratio)
    const bitmap = await createImageBitmap(blob);
    const targetWidth = 200;
    const aspectRatio = bitmap.height / bitmap.width;
    const targetHeight = Math.floor(targetWidth * aspectRatio);
    
    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    
    // Converter para WebP comprimido
    const thumbnailBlob = await canvas.convertToBlob({
      type: 'image/webp',
      quality: 0.7
    });

    const thumbnailFile = new File([thumbnailBlob], 'thumb.webp', { type: 'image/webp' });
    const { file_url: thumbnail_url } = await base44.asServiceRole.integrations.Core.UploadFile({ 
      file: thumbnailFile 
    });

    console.log(`[Thumbnail] Generated: ${thumbnailBlob.size}B (${targetWidth}x${targetHeight})`);

    return Response.json({
      thumbnail_url,
      width: targetWidth,
      height: targetHeight,
      size: thumbnailBlob.size
    });
  } catch (error) {
    console.error('[Thumbnail Error]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});