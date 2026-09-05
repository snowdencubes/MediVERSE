import { NextRequest, NextResponse } from 'next/server';
import { logQuestionFlow } from '@/lib/logger';
import { getConfig } from '@/lib/config-watcher';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  logQuestionFlow.info('Intake submission received');

  try {
    const body = await req.json();
    const config = getConfig();

    logQuestionFlow.info(
      { stage: body.stage, complaintLength: body.complaint?.length, model: config.defaultModel },
      'Processing stage: %s',
      body.stage
    );

    // TODO: Save to Supabase
    // TODO: Trigger AI summarization if final stage

    const elapsed = Date.now() - startTime;
    logQuestionFlow.info({ elapsed }, 'Intake processed in %dms', elapsed);

    return NextResponse.json({ success: true, elapsed });
  } catch (err) {
    logQuestionFlow.error({ err }, 'Intake processing failed');
    return NextResponse.json({ error: 'Failed to process intake' }, { status: 500 });
  }
}
