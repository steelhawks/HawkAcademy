import type { PrismTheme } from 'prism-react-renderer';

/**
 * Hawk Code Theme — Steel Hawks FRC Curriculum
 * Modeled after VS Code Dark+ / IntelliJ IDEA Darcula with FRC/Java emphasis.
 *
 * Token reference for Java (from Prism):
 *   annotation  →  @Override, @Inject
 *   keyword     →  public, return, class, new, double, int, boolean, void …
 *   class-name  →  Command, String, RobotContainer …
 *   function    →  driveForTime(), run(), arcade() …
 *   comment     →  // …  /* … *\/
 *   string      →  "hello"
 *   number      →  42, 3.14
 *   boolean     →  true, false
 *   operator    →  =, ->, +, !, &&
 *   punctuation →  ( ) { } ; .
 *   variable    →  (rare in Prism Java, but present in JS/TS)
 *   inserted    →  diff + lines
 *   deleted     →  diff − lines
 *   changed     →  diff ~ lines
 */

const hawkCodeTheme: PrismTheme = {
  plain: {
    color: '#D4D4D4',          // VS Code plain text gray
    backgroundColor: '#1E1E1E', // VS Code classic dark background
  },
  styles: [

    // ── COMMENTS ──────────────────────────────────────────────
    // Green + italic, like every major editor
    {
      types: ['comment', 'block-comment', 'prolog', 'doctype', 'cdata'],
      style: { color: '#6A9955', fontStyle: 'italic' },
    },

    // ── KEYWORDS ──────────────────────────────────────────────
    // VS Code blue — public, private, static, void, class, new,
    //                return, extends, implements, throws, this …
    {
      types: ['keyword'],
      style: { color: '#569CD6', fontWeight: 'bold' },
    },

    // Primitive / built-in type keywords share the blue
    {
      types: ['builtin'],
      style: { color: '#569CD6' },
    },

    // ── CLASS / TYPE NAMES ────────────────────────────────────
    // VS Code teal — String, Command, RobotContainer, Supplier …
    {
      types: ['class-name'],
      style: { color: '#4EC9B0' },
    },

    // ── FUNCTIONS / METHODS ───────────────────────────────────
    // VS Code yellow-sand — driveForTime(), run(), withTimeout()
    {
      types: ['function'],
      style: { color: '#DCDCAA' },
    },

    // ── ANNOTATIONS ───────────────────────────────────────────
    // Bright gold + italic — @Override, @Inject, @Deprecated
    {
      types: ['annotation'],
      style: { color: '#C8C832', fontStyle: 'italic' },
    },

    // ── STRINGS ───────────────────────────────────────────────
    // VS Code salmon/orange — "driveForTime", 'x'
    {
      types: ['string', 'char', 'attr-value', 'template-string', 'template-punctuation'],
      style: { color: '#CE9178' },
    },

    // ── NUMBERS ───────────────────────────────────────────────
    // VS Code light mint — 42, 0.5, 0xFF
    {
      types: ['number'],
      style: { color: '#B5CEA8' },
    },

    // ── BOOLEANS & NULL ───────────────────────────────────────
    // Same blue as keywords — true, false, null
    {
      types: ['boolean', 'null'],
      style: { color: '#569CD6' },
    },

    // ── OPERATORS ─────────────────────────────────────────────
    // Bright white — =, ->, +, !, &&, ||, >=
    {
      types: ['operator'],
      style: { color: '#D4D4D4' },
    },

    // ── PUNCTUATION ───────────────────────────────────────────
    // Muted gray — ( ) { } ; .  — don't compete with real tokens
    {
      types: ['punctuation'],
      style: { color: '#808080' },
    },

    // ── VARIABLES / PARAMETERS ────────────────────────────────
    // VS Code light blue — fwd, seconds, name (JS/TS)
    {
      types: ['variable', 'attr-name'],
      style: { color: '#9CDCFE' },
    },

    // ── TAGS (HTML/XML/JSX) ───────────────────────────────────
    {
      types: ['tag'],
      style: { color: '#4EC9B0' },
    },

    // ── SELECTORS (CSS) ───────────────────────────────────────
    {
      types: ['selector'],
      style: { color: '#D7BA7D' },
    },

    // ── PROPERTIES (CSS / JSON) ───────────────────────────────
    {
      types: ['property'],
      style: { color: '#9CDCFE' },
    },

    // ── REGEX ─────────────────────────────────────────────────
    {
      types: ['regex'],
      style: { color: '#D16969' },
    },

    // ── IMPORTANT / BOLD ──────────────────────────────────────
    {
      types: ['important'],
      style: { color: '#dc143c', fontWeight: 'bold' },
    },

    // ══ DIFF SUPPORT ══════════════════════════════════════════

    // Inserted lines  (+)  — green fg + subtle green wash
    {
      types: ['inserted'],
      style: {
        color: '#89D185',
        backgroundColor: 'rgba(80, 200, 100, 0.10)',
      },
    },

    // Deleted lines   (-)  — red fg + subtle red wash
    {
      types: ['deleted'],
      style: {
        color: '#F14C4C',
        backgroundColor: 'rgba(244, 71, 71, 0.12)',
      },
    },

    // Changed lines   (~)  — amber fg + subtle amber wash
    {
      types: ['changed'],
      style: {
        color: '#FFCA80',
        backgroundColor: 'rgba(255, 200, 0, 0.08)',
      },
    },
  ],
};

export default hawkCodeTheme;
