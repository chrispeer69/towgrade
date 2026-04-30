"use client";

type Props = {
  value: number | undefined;
  onChange: (n: number) => void;
  ariaLabel: string;
};

const STARS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export default function StarRating({ value, onChange, ariaLabel }: Props) {
  return (
    <div className="stars" role="radiogroup" aria-label={ariaLabel}>
      {STARS.map((n) => {
        const lit = value !== undefined && n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} of 10`}
            className={`star${lit ? " on" : ""}`}
            onClick={() => onChange(n)}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
