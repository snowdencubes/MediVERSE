import { NextRequest, NextResponse } from 'next/server';
import { logOCR } from '@/lib/logger';
import { getConfig } from '@/lib/config-watcher';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  logOCR.info('Document upload received');

  try {
    const config = getConfig();
    
    // Check file size from content-length header
    const contentLength = parseInt(req.headers.get('content-length') || '0');
    const maxBytes = config.maxUploadSizeMB * 1024 * 1024;
    
    if (contentLength > maxBytes) {
      logOCR.warn({ contentLength, maxBytes }, 'Upload exceeds size limit');
      return NextResponse.json(
        { error: `File too large. Max ${config.maxUploadSizeMB}MB` },
        { status: 413 }
      );
    }

    // TODO: Forward to OCR API (process.env.OCR_ENDPOINT)
    // TODO: Save extracted text to Supabase
    
    logOCR.info('OCR extraction placeholder — wire to real OCR API');

    const elapsed = Date.now() - startTime;
    logOCR.info({ elapsed }, 'Upload processed in %dms', elapsed);

    return NextResponse.json({
      success: true,
      extractedText: 'OCR placeholder — integration pending',
      elapsed,
    });
  } catch (err) {
    logOCR.error({ err }, 'Upload processing failed');
    return NextResponse.json({ error: 'Failed to process upload' }, { status: 500 });
  }
}
