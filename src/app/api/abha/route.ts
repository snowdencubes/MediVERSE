import { NextRequest, NextResponse } from 'next/server';
import { logABHA } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  logABHA.info('ABHA verification request received');

  try {
    const body = await req.json();
    const { abhaId } = body;

    logABHA.info({ abhaId }, 'Looking up ABHA ID: %s', abhaId);

    // TODO: Call ABDM API to verify ABHA ID
    // const abdmUrl = process.env.ABDM_BASE_URL;
    // const clientId = process.env.ABDM_CLIENT_ID;
    // const clientSecret = process.env.ABDM_CLIENT_SECRET;

    const elapsed = Date.now() - startTime;
    logABHA.info({ elapsed }, 'ABHA lookup completed in %dms', elapsed);

    return NextResponse.json({
      success: true,
      patient: {
        name: 'ABHA lookup placeholder',
        abhaId,
      },
      elapsed,
    });
  } catch (err) {
    logABHA.error({ err }, 'ABHA lookup failed');
    return NextResponse.json({ error: 'Failed to verify ABHA' }, { status: 500 });
  }
}
