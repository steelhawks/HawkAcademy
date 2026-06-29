import type { PrismTheme } from 'prism-react-renderer';

/**
 * Hawk Code Theme — Steel Hawks FRC Curriculum
 * Palette: Catppuccin Mocha — vibrant, editor-accurate, dark.
 *
 * Java token map (Prism):
 *   annotation  → @Override, @Inject
 *   keyword     → public, return, class, double, int, boolean, void, new …
 *   class-name  → Command, String, System, RobotContainer …
 *   function    → driveForTime(), run(), println(), withTimeout() …
 *   comment     → // …  /* … *\/
 *   string      → "hello"
 *   number      → 42, 3.14
 *   boolean     → true, false
 *   operator    → =, ->, +, !, &&, ||
 *   punctuation → ( ) { } ; .
 *   inserted    → diff + lines
 *   deleted     → diff − lines
 *   changed     → diff ~ lines
 */

const hawkCodeTheme: PrismTheme = {
  plain: {
    color: '#CDD6F4',           // Catppuccin Text — clean blue-white
    backgroundColor: '#1E1E2E', // Catppuccin Base — rich dark navy
  },
  styles: [

    // ── COMMENTS ──────────────────────────────────────────────
    // Muted + italic — clearly deprioritized from code
    {
      types: ['comment', 'block-comment', 'prolog', 'doctype', 'cdata'],
      style: { color: '#6C7086', fontStyle: 'italic' },
    },

    // ── KEYWORDS ──────────────────────────────────────────────
    // Mauve purple + bold — public, private, return, class, new, void …
    {
      types: ['keyword'],
      style: { color: '#CBA6F7', fontWeight: 'bold' },
    },

    // ── BUILT-INS ─────────────────────────────────────────────
    // Same mauve — built-in type qualifiers
    {
      types: ['builtin'],
      style: { color: '#CBA6F7', fontWeight: 'bold' },
    },

    // ── CLASS / TYPE NAMES ────────────────────────────────────
    // Sky blue — String, Command, System, RobotContainer …
    {
      types: ['class-name'],
      style: { color: '#89DCEB' },
    },

    // ── FUNCTIONS / METHODS ───────────────────────────────────
    // Sapphire blue — driveForTime(), println(), withTimeout() …
    {
      types: ['function'],
      style: { color: '#89B4FA' },
    },

    // ── ANNOTATIONS ───────────────────────────────────────────
    // Green + italic — @Override, @Deprecated, @Inject
    {
      types: ['annotation'],
      style: { color: '#A6E3A1', fontStyle: 'italic' },
    },

    // ── STRINGS ───────────────────────────────────────────────
    // Peach/orange — "Steel Hawks", "My name is "
    {
      types: ['string', 'char', 'attr-value', 'template-string', 'template-punctuation'],
      style: { color: '#FAB387' },
    },

    // ── NUMBERS ───────────────────────────────────────────────
    // Yellow — 42, 0.5, 3.14
    {
      types: ['number'],
      style: { color: '#F9E2AF' },
    },

    // ── BOOLEANS & NULL ───────────────────────────────────────
    // Same mauve as keywords — true, false, null
    {
      types: ['boolean', 'null'],
      style: { color: '#CBA6F7', fontWeight: 'bold' },
    },

    // ── OPERATORS ─────────────────────────────────────────────
    // Sky/cyan — =, ->, +, !=, &&, ||
    {
      types: ['operator'],
      style: { color: '#89DCEB' },
    },

    // ── PUNCTUATION ───────────────────────────────────────────
    // Overlay — ( ) { } ; .  — deprioritized so they don't compete
    {
      types: ['punctuation'],
      style: { color: '#9399B2' },
    },

    // ── VARIABLES / PARAMETERS ────────────────────────────────
    // Lavender — (JS/TS vars, some Java params when Prism tags them)
    {
      types: ['variable', 'attr-name', 'parameter'],
      style: { color: '#B4BEFE' },
    },

    // ── PROPERTIES ───────────────────────────────────────────
    // Teal — JSON keys, CSS props
    {
      types: ['property'],
      style: { color: '#89DCEB' },
    },

    // ── TAGS (HTML / JSX) ─────────────────────────────────────
    {
      types: ['tag'],
      style: { color: '#F38BA8' },
    },

    // ── SELECTORS (CSS) ───────────────────────────────────────
    {
      types: ['selector'],
      style: { color: '#CBA6F7' },
    },

    // ── REGEX ─────────────────────────────────────────────────
    {
      types: ['regex'],
      style: { color: '#F38BA8' },
    },

    // ── IMPORTANT ─────────────────────────────────────────────
    {
      types: ['important'],
      style: { color: '#dc143c', fontWeight: 'bold' },
    },

    // ══ DIFF SUPPORT ══════════════════════════════════════════

    // Inserted  (+)  — green text + subtle green wash
    {
      types: ['inserted'],
      style: {
        color: '#A6E3A1',
        backgroundColor: 'rgba(166, 227, 161, 0.12)',
      },
    },

    // Deleted   (-)  — red text + subtle red wash
    {
      types: ['deleted'],
      style: {
        color: '#F38BA8',
        backgroundColor: 'rgba(243, 139, 168, 0.14)',
      },
    },

    // Changed   (~)  — yellow text + subtle yellow wash
    {
      types: ['changed'],
      style: {
        color: '#F9E2AF',
        backgroundColor: 'rgba(249, 226, 175, 0.10)',
      },
    },
  ],
};

export default hawkCodeTheme;
