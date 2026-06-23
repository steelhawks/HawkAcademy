import React, { useState } from 'react';
import CodeBlock from '@theme/CodeBlock';

/**
 * A reusable dropdown component for brain teaser solutions.
 * @param {string} code - The code snippet to display.
 * @param {string} explanation - The text explanation of the solution.
 * @param {string} label - Optional: The text on the clickable bar (defaults to "View Solution").
 * @param {string} language - Optional: The language for syntax highlighting (defaults to "java").
 */
const SolutionDropdown = ({ code, explanation, label = "View Solution", language = "java" }) => {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ margin: '20px 0' }}>
      <details
        onToggle={(e) => setOpen(e.target.open)}
        style={{
          border: '1px solid var(--ifm-color-emphasis-300)',
          borderRadius: '8px',
          overflow: 'hidden',
          background: 'var(--ifm-card-background-color, var(--ifm-background-surface-color))',
        }}
      >
        <summary
          style={{
            fontWeight: 600,
            padding: '12px 16px',
            cursor: 'pointer',
            backgroundColor: 'var(--ifm-color-emphasis-100)',
            color: 'var(--ifm-font-color-base)',
            userSelect: 'none',
            listStyle: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{
            display: 'inline-block',
            transition: 'transform 0.2s ease',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            fontSize: '12px',
          }}>
            ▶
          </span>
          {label}
        </summary>

        <div style={{
          padding: '16px',
          backgroundColor: 'var(--ifm-card-background-color, var(--ifm-background-surface-color))',
        }}>
          {explanation && (
            <p style={{
              marginTop: 0,
              marginBottom: code ? '12px' : 0,
              color: 'var(--ifm-font-color-base)',
              lineHeight: '1.6',
            }}>
              {explanation}
            </p>
          )}

          {code && (
            <CodeBlock language={language}>
              {code.trim()}
            </CodeBlock>
          )}
        </div>
      </details>
    </div>
  );
};

export default SolutionDropdown;
