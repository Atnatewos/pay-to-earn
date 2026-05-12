// public/js/loaderConfig.js

/**
 * Centralized Loading Configuration
 * Change any loading behavior here and it applies everywhere
 * No other file has hardcoded loading values
 */

const LOADER_CONFIG = {
  // Spinner sizes in pixels
  sizes: {
    sm: 16,
    md: 32,
    lg: 48,
    xl: 64
  },

  // Spinner colors from design system
  color: 'var(--color-primary)',
  secondaryColor: 'var(--color-border)',

  // Animation speed
  speed: '0.7s',

  // Default texts for different actions
  texts: {
    default: 'Loading...',
    saving: 'Saving changes...',
    verifying: 'Verifying...',
    processing: 'Processing...',
    submitting: 'Submitting...',
    approving: 'Approving...',
    rejecting: 'Rejecting...',
    deleting: 'Deleting...',
    generating: 'Generating...'
  },

  // Skeleton loader defaults
  skeleton: {
    count: 3,
    height: '16px',
    gap: '8px',
    color: 'var(--color-border-light)',
    borderRadius: 'var(--radius-md)'
  },

  // Predefined loading placements for each page section
  placements: {
    'depositsList': { type: 'spinner', size: 'lg' },
    'withdrawalsList': { type: 'spinner', size: 'lg' },
    'usersList': { type: 'skeleton', count: 5 },
    'codesList': { type: 'spinner', size: 'md' },
    'salaryHistory': { type: 'spinner', size: 'md' },
    'featuresList': { type: 'skeleton', count: 4 },
    'broadcastHistory': { type: 'spinner', size: 'md' },
    'logsList': { type: 'spinner', size: 'md' },
    'depositHistory': { type: 'skeleton', count: 3 },
    'historyList': { type: 'skeleton', count: 3 },
    'taskHistoryList': { type: 'spinner', size: 'md' },
    'homeContent': { type: 'skeleton', count: 4 },
    'packagesContent': { type: 'skeleton', count: 5 },
    'teamContent': { type: 'spinner', size: 'lg' },
    'leaderboardContent': { type: 'spinner', size: 'lg' },
    'earningsContent': { type: 'spinner', size: 'lg' },
    'profileContent': { type: 'spinner', size: 'lg' },
    'withdrawContent': { type: 'spinner', size: 'lg' },
    'notificationsList': { type: 'spinner', size: 'md' },
    'alertsContent': { type: 'spinner', size: 'md' }
  }
};