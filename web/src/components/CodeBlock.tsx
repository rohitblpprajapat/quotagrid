'use client';

import React, { useState, useCallback } from 'react';

export interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  className?: string;
}

export function CodeBlock({ code, language, title, className = '' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code to clipboard', err);
    }
  }, [code]);

  return (
    <div
      className={`relative rounded-xl border border-[#2a2638] bg-[#0e0c17] overflow-hidden text-left shadow-lg ${className}`}
    >
      {(title || language) && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#161324] border-b border-[#2a2638] text-xs">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#3b3452]" />
            {title ? (
              <span className="font-mono font-medium text-[#f4f2fa]">{title}</span>
            ) : null}
          </div>
          {language && (
            <span className="font-mono uppercase tracking-wider text-[#a39fb5] text-[11px] px-2 py-0.5 rounded bg-[#201d32] border border-[#2e2946]">
              {language}
            </span>
          )}
        </div>
      )}

      <div className="relative group">
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
          className={`absolute top-3 right-3 z-10 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border ${
            copied
              ? 'bg-[#22c55e]/15 border-[#22c55e]/50 text-[#22c55e]'
              : 'bg-[#1e1b2e] hover:bg-[#2c2744] border-[#342e4d] text-[#a39fb5] hover:text-[#f4f2fa] opacity-90 hover:opacity-100'
          }`}
        >
          {copied ? (
            <>
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>

        <pre className="p-4 overflow-x-auto text-sm font-mono text-[#f4f2fa] leading-relaxed selection:bg-[#8b5cf6]/30">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

export default CodeBlock;
