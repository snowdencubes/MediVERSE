import { logQuestionFlow, logOCR, logABHA, logSummarizer, logServer } from './logger';

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startStatusReporter(intervalMs = 30_000): void {
  if (intervalId) return;

  intervalId = setInterval(() => {
    logServer.info('[Server] alive — uptime %ds', Math.floor(process.uptime()));
    logQuestionFlow.info('[QuestionFlow] ready');
    logOCR.info('[OCR] %s', process.env.OCR_API_KEY ? 'connected' : 'no key — standby');
    logABHA.info('[ABHA] %s', process.env.ABDM_CLIENT_ID ? 'connected' : 'no credentials — standby');
    logSummarizer.info('[Summarizer] idle');
  }, intervalMs);

  // Don't block process exit
  if (intervalId && typeof intervalId === 'object' && 'unref' in intervalId) {
    intervalId.unref();
  }

  logServer.info('Status reporter started (every %ds)', intervalMs / 1000);
}

export function stopStatusReporter(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
