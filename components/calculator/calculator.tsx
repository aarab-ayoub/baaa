'use client';

import dynamic from 'next/dynamic';
import { CalculatorBones } from './calculator-bones';

// the calculator lives in the browser: it starts from what's saved there (in grey until
// its code is here)
export const Calculator = dynamic(() => import('./calculator-view').then((m) => m.CalculatorView), { ssr: false, loading: () => <CalculatorBones /> });
