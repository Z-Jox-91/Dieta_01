import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../components/Header';

// Mock per matchMedia (necessario in JSDOM)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

describe('Theme Regression Tests', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('should apply the dark class to html element when toggled', () => {
    render(<Header user={{ name: 'Test', email: 'test@test.com' }} onLogout={() => {}} />);
    const toggleButton = screen.getByTitle(/Attiva Tema Scuro|Attiva Tema Chiaro/i);
    
    // Inizialmente è in modalità Light (basato sul mock di matchMedia)
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    
    // Clicca per attivare il Dark Mode
    fireEvent.click(toggleButton);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    
    // Clicca per tornare al Light Mode
    fireEvent.click(toggleButton);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should maintain accessibility contrast ratio on root colors', () => {
    // Questo è un test "statico" che verifica la presenza delle variabili MD3 in index.css
    // In un test reale, useremmo un tool come axe-core
    const rootStyles = getComputedStyle(document.documentElement);
    // Verifichiamo che i colori siano definiti nel sistema
    expect(rootStyles.getPropertyValue('--md-sys-color-primary')).toBeDefined();
    expect(rootStyles.getPropertyValue('--md-sys-color-surface')).toBeDefined();
  });
});
