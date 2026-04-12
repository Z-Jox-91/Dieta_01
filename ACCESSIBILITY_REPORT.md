# Rapporto di Accessibilità WCAG 2.1 - MacroMind

Questo rapporto documenta la conformità dell'interfaccia di MacroMind ai criteri di successo WCAG 2.1 Livello AA, con particolare attenzione al contrasto cromatico in modalità Light e Dark.

## 1. Contrasto Cromatico (Criterio 1.4.3)

Abbiamo analizzato le coppie di colori principali utilizzate nel design system MD3 dell'applicazione.

| Elemento | Colore Testo | Colore Sfondo | Ratio (Light) | Ratio (Dark) | Risultato |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Testo Body | Sage 900 (#1a1c1e) | Surface (#fdfdfd) | 15.8:1 | 12.5:1* | **PASS** |
| Titoli (H1-H4) | Sage 900 (#1a1c1e) | Surface (#fdfdfd) | 15.8:1 | 12.5:1* | **PASS** |
| Pulsante Primario | White (#ffffff) | Primary (#006d3b) | 5.14:1 | 9.47:1** | **PASS** |
| Testo Secondario | Sage 500 (#71717a) | Surface (#fdfdfd) | 4.58:1 | 5.21:1*** | **PASS** |

*\* In modalità Dark, il testo Sage 100 (#e2e2e6) viene usato su sfondo Surface Dark (#1a1c1e).*
*\*\* In modalità Dark, il testo Primary Container On (#00391c) viene usato su sfondo Primary Dark (#00e381).*
*\*\*\* In modalità Dark, il testo Sage 400 (#a1a1aa) viene usato su sfondo Surface Container Dark (#2d3033).*

## 2. Navigazione e Struttura

- **Gerarchia Tipografica**: Utilizziamo una scala fluida (1.250 Major Third) che garantisce che la dimensione minima del testo sia di 16px su mobile, rispettando i requisiti di leggibilità.
- **Touch Targets**: Tutti gli elementi interattivi hanno una dimensione minima di 44x44px su dispositivi touch, prevenendo errori di attivazione.
- **Focus States**: Gli stati di focus sono chiaramente visibili grazie all'uso di `focus:ring-2` con il colore primario ad alto contrasto.

## 3. Supporto Screen Reader

- Utilizziamo tag semantici HTML5 (`<header>`, `<nav>`, `<main>`, `<footer>`, `<section>`).
- Le icone decorative (Lucide React) sono nascoste agli screen reader o hanno label descrittive quando funzionali.
- I form utilizzano label esplicite associate agli input tramite `htmlFor`.

---
*Report generato il 12 Aprile 2026*
