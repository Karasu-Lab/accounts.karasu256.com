'use client';

export interface StrengthLabels {
  weak: string;
  fair: string;
  good: string;
  strong: string;
}

export interface StrengthColors {
  weak: string;
  fair: string;
  good: string;
  strong: string;
}

interface Props {
  password: string;
  labels?: StrengthLabels;
  colors?: StrengthColors;
}

interface Criterion {
  test: (p: string) => boolean;
}

const CRITERIA: Criterion[] = [
  { test: (p) => p.length >= 8 },
  { test: (p) => /[A-Z]/.test(p) },
  { test: (p) => /[a-z]/.test(p) },
  { test: (p) => /[0-9]/.test(p) },
  { test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const DEFAULT_LABELS: StrengthLabels = {
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
};

const DEFAULT_COLORS: StrengthColors = {
  weak: '#ef4444',
  fair: '#fb923c',
  good: '#facc15',
  strong: '#22c55e',
};

function getStrengthLevel(score: number): 1 | 2 | 3 | 4 {
  if (score <= 1) return 1;
  if (score <= 2) return 2;
  if (score <= 4) return 3;
  return 4;
}

/**
 * Displays a single-bar strength indicator and label for the given password.
 *
 * The bar grows from the left (scaleX) as strength increases and shrinks when
 * it decreases. The label slides in from the left on each level change.
 *
 * Label and bar color strings default to English text and standard colors;
 * pass {@link labels} or {@link colors} to override.
 */
export function PasswordStrengthIndicator({ password, labels = DEFAULT_LABELS, colors = DEFAULT_COLORS }: Props) {
  const score = password ? CRITERIA.filter((c) => c.test(password)).length : 0;
  const level = getStrengthLevel(score);

  const labelMap: Record<number, string> = {
    1: labels.weak,
    2: labels.fair,
    3: labels.good,
    4: labels.strong,
  };

  const colorMap: Record<number, string> = {
    1: colors.weak,
    2: colors.fair,
    3: colors.good,
    4: colors.strong,
  };

  return (
    <div className="mt-3 space-y-1.5">
      <div className="relative h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-0 rounded-full transition-[transform,background-color] duration-150 ease-out origin-left"
          style={{
            transform: `scaleX(${password ? level / 4 : 0})`,
            backgroundColor: colorMap[level],
          }}
        />
      </div>
      <div className="overflow-hidden">
        <p key={`${level}-${!!password}`} className="text-xs text-muted-foreground animate-[slide-from-left_150ms_ease-out]">
          {password ? labelMap[level] : ' '}
        </p>
      </div>
    </div>
  );
}
