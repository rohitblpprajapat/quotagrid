'use client';

import React from 'react';

// ==========================================
// Card
// ==========================================
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-[#2a2638] bg-[#15131d] p-6 text-[#f4f2fa] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ==========================================
// Button
// ==========================================
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  children?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  let variantClasses = '';
  if (variant === 'primary') {
    variantClasses =
      'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white shadow-sm border border-[#8b5cf6]/50';
  } else if (variant === 'secondary') {
    variantClasses =
      'bg-[#15131d] hover:bg-[#1f1c2b] text-[#f4f2fa] border border-[#2a2638] hover:border-[#8b5cf6]/50';
  } else if (variant === 'ghost') {
    variantClasses =
      'bg-transparent hover:bg-[#15131d] text-[#a39fb5] hover:text-[#f4f2fa] border border-transparent';
  }

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/50 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

// ==========================================
// Stat
// ==========================================
export interface StatProps {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}

export function Stat({ label, value, hint, className = '' }: StatProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="text-xs font-mono uppercase tracking-wider text-[#a39fb5]">
        {label}
      </div>
      <div className="text-2xl sm:text-3xl font-mono font-bold text-[#f4f2fa]">
        {value}
      </div>
      {hint && <div className="text-xs text-[#a39fb5]">{hint}</div>}
    </div>
  );
}

// ==========================================
// Badge
// ==========================================
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'default' | 'purple' | 'amber' | 'green' | 'red';
  children?: React.ReactNode;
  className?: string;
}

export function Badge({
  tone = 'default',
  children,
  className = '',
  ...props
}: BadgeProps) {
  let toneClasses = '';
  switch (tone) {
    case 'purple':
      toneClasses = 'bg-[#8b5cf6]/15 border-[#8b5cf6]/40 text-[#a78bfa]';
      break;
    case 'amber':
      toneClasses = 'bg-amber-950/50 border-amber-500/40 text-amber-300';
      break;
    case 'green':
      toneClasses = 'bg-[#22c55e]/15 border-[#22c55e]/40 text-[#22c55e]';
      break;
    case 'red':
      toneClasses = 'bg-rose-950/50 border-rose-500/40 text-rose-300';
      break;
    case 'default':
    default:
      toneClasses = 'bg-[#15131d] border-[#2a2638] text-[#a39fb5]';
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${toneClasses} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

// ==========================================
// Input
// ==========================================
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full bg-[#0b0a10] border border-[#2a2638] rounded-lg px-3 py-2 text-[#f4f2fa] placeholder-[#a39fb5] focus:outline-none focus:border-[#8b5cf6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
}

// ==========================================
// Textarea
// ==========================================
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export function Textarea({ className = '', ...props }: TextareaProps) {
  return (
    <textarea
      className={`w-full bg-[#0b0a10] border border-[#2a2638] rounded-lg px-3 py-2 text-[#f4f2fa] placeholder-[#a39fb5] focus:outline-none focus:border-[#8b5cf6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
}

// ==========================================
// Select
// ==========================================
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
  children?: React.ReactNode;
}

export function Select({ children, className = '', ...props }: SelectProps) {
  return (
    <select
      className={`w-full bg-[#0b0a10] border border-[#2a2638] rounded-lg px-3 py-2 text-[#f4f2fa] focus:outline-none focus:border-[#8b5cf6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

// ==========================================
// Field
// ==========================================
export interface FieldProps {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Field({
  label,
  hint,
  error,
  children,
  className = '',
}: FieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs uppercase tracking-wider font-semibold text-[#a39fb5]">
          {label}
        </label>
        {hint && <span className="text-xs text-[#a39fb5]">{hint}</span>}
      </div>
      {children}
      {error && <div className="text-xs text-rose-400 font-mono">{error}</div>}
    </div>
  );
}

// ==========================================
// Mono
// ==========================================
export interface MonoProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  className?: string;
}

export function Mono({ children, className = '', ...props }: MonoProps) {
  return (
    <span className={`font-mono ${className}`} {...props}>
      {children}
    </span>
  );
}
