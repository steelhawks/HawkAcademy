import React from 'react';

/**
 * A reusable dropdown component for brain teaser solutions.
 * @param {string} code - The code snippet to display.
 * @param {string} explanation - The text explanation of the solution.
 * @param {string} label - Optional: The text on the clickable bar (defaults to "Solution").
 */
const SolutionDropdown = ({ code, explanation, label = "View Solution" }) => {
  return (
    <div style={{ margin: '20px 0' }}>
      <details style={{
        border: '1px solid var(--ifm-color-emphasis-200, #e5e7eb)',
        borderRadius: '8px',
        overflow: 'hidden',
        background: 'var(--ifm-card-background-color, var(--ifm-background-surface-color))'
      }}>
        <summary style={{
          fontWeight: 600,
          padding: '12px 16px',
          cursor: 'pointer',
          backgroundColor: 'var(--ifm-color-emphasis-100, #f3f4f6)',
          color: 'var(--ifm-font-color-base)',
          userSelect: 'none',
          listStyle: 'none' // Removes the default arrow in some browsers
        }}>
          ▼ {label}
        </summary>

        <div style={{ padding: '16px', backgroundColor: 'var(--ifm-card-background-color, var(--ifm-background-surface-color))' }}>
          {explanation && (
            <p style={{ marginTop: 0, color: 'var(--ifm-font-color-base)', lineHeight: '1.6' }}>
              {explanation}
            </p>
          )}

          {code && (
            <pre style={{
              backgroundColor: 'var(--ifm-pre-background, #1e1e1e)',
              padding: '15px',
              borderRadius: '6px',
              overflowX: 'auto',
              fontSize: '14px',
              lineHeight: '1.5',
              margin: 0
            }}>
              <code>{code}</code>
            </pre>
          )}
        </div>
      </details>
    </div>
  );
};

export default SolutionDropdown;