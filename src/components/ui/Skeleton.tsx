import React from 'react';

/** Blocco segnaposto animato, usato durante il caricamento dei dati da Firestore. */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-sage-200 dark:bg-sage-800 rounded-md3-small ${className}`} />
);

export const SkeletonTableRows: React.FC<{ rows?: number; columns?: number }> = ({ rows = 5, columns = 6 }) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r} className="border-b border-sage-100 dark:border-sage-800 last:border-0">
        {Array.from({ length: columns }).map((_, c) => (
          <td key={c} className="px-6 py-4">
            <Skeleton className="h-4 w-full max-w-[120px]" />
          </td>
        ))}
      </tr>
    ))}
  </>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`md3-card border border-sage-200 dark:border-sage-800 p-6 space-y-4 ${className}`}>
    <Skeleton className="h-5 w-1/3" />
    <Skeleton className="h-4 w-2/3" />
    <Skeleton className="h-10 w-full" />
  </div>
);
