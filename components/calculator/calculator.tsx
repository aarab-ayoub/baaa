'use client';

import dynamic from 'next/dynamic';

// the calculator lives in the browser: it starts from what's saved there
export const Calculator = dynamic(() => import('./calculator-view').then((m) => m.CalculatorView), { ssr: false });
