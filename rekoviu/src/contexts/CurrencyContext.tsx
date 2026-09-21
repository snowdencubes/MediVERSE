'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY';

interface CurrencyContextType {
  currency: Currency;
  symbol: string;
  setCurrency: (c: Currency) => void;
  formatPrice: (amount: number | string) => string;
}

const SYMBOL_MAP: Record<Currency, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
};

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'INR',
  symbol: '₹',
  setCurrency: () => {},
  formatPrice: (a) => `₹${a}`,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('INR');

  useEffect(() => {
    // 1. Check localStorage for user preference
    const saved = localStorage.getItem('MediVERSE_currency') as Currency | null;
    if (saved && SYMBOL_MAP[saved]) {
      // If the saved value is an old USD default, reset it to INR unless user explicitly picked it
      setCurrencyState(saved);
    } else {
      // Default to INR
      setCurrencyState('INR');
      localStorage.setItem('MediVERSE_currency', 'INR');
    }

    // 2. Fetch from backend
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}:4040/api/v1`;
    fetch(`${apiUrl}/settings/currency`)
      .then(res => res.json())
      .then(d => {
        if (d.currency && SYMBOL_MAP[d.currency as Currency]) {
          setCurrencyState(d.currency as Currency);
          localStorage.setItem('MediVERSE_currency', d.currency);
        }
      })
      .catch(() => {});
  }, []);

  const setCurrency = (newCurrency: Currency) => {
    if (!SYMBOL_MAP[newCurrency]) return;
    setCurrencyState(newCurrency);
    localStorage.setItem('MediVERSE_currency', newCurrency);

    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}:4040/api/v1`;
    fetch(`${apiUrl}/settings/currency`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency: newCurrency }),
    }).catch(() => {});
  };

  const symbol = SYMBOL_MAP[currency] || '₹';

  const formatPrice = (amount: number | string): string => {
    const val = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(val)) return `${symbol}0`;
    return `${symbol}${val % 1 === 0 ? val : val.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, symbol, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
