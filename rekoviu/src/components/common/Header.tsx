'use client';

import { MediVERSENav } from './MediVERSENav';

export function Header({ currentModule }: { currentModule: string }) {
  return <MediVERSENav currentModule={currentModule} />;
}
