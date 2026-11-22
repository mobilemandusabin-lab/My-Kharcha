import React from 'react';
import { motion } from 'framer-motion';
import { cn, formatNPR } from '../../lib/utils';

export const MotionDiv = motion.div;

export function Page({ children, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn('p-4 sm:p-5 md:p-6 space-y-4 md:space-y-5', className)}
    >
      {children}
    </motion.div>
  );
}

export function Card({ children, className, ...props }) {
  return <div className={cn('card p-4 sm:p-5', className)} {...props}>{children}</div>;
}

export function StatCard({ title, value, sub, tone = 'neutral', icon: Icon }) {
  const tones = {
    neutral: 'text-slate-900 dark:text-slate-100',
    income: 'text-emerald-700',
    expense: 'text-rose-700',
    accent: 'text-teal-700',
  };
  const iconBg = {
    neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-500',
    income: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
    expense: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400',
    accent: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400',
  };
  return (
    <motion.div whileTap={{ scale: 0.98 }} className="card p-4 flex flex-col justify-between min-h-[112px]">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 leading-snug pr-1">{title}</div>
        {Icon ? <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center shrink-0', iconBg[tone])}><Icon size={16} /></div> : null}
      </div>
      <div>
        <div className={cn('text-lg sm:text-xl font-semibold tabular-nums mt-2', tones[tone])}>{typeof value === 'number' ? formatNPR(value) : value}</div>
        {sub ? <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">{sub}</div> : null}
      </div>
    </motion.div>
  );
}

export function Button({ children, className, variant = 'primary', loading, ...props }) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn bg-rose-600 text-white hover:bg-rose-700',
  };
  return (
    <motion.button whileTap={{ scale: 0.98 }} className={cn(variants[variant], className)} disabled={loading || props.disabled} {...props}>
      {loading ? <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : null}
      {children}
    </motion.button>
  );
}

export function Badge({ children, tone = 'slate', className }) {
  const tones = {
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    amber: 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300',
    emerald: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300',
    rose: 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300',
    teal: 'bg-teal-100 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300',
  };
  return <span className={cn('chip', tones[tone], className)}>{children}</span>;
}

export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} />;
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">✦</div>
      <div className="font-semibold text-slate-800 dark:text-slate-200">{title}</div>
      {description ? <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">{description}</div> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function SectionTitle({ children, action, className }) {
  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{children}</h2>
      {action}
    </div>
  );
}
