"use client";

export type PasswordRules = {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasSpecial: boolean;
};

export function evaluatePassword(p: string): PasswordRules {
  return {
    minLength: p.length >= 8,
    hasUpper: /[A-Z]/.test(p),
    hasLower: /[a-z]/.test(p),
    hasSpecial: /[^A-Za-z0-9]/.test(p),
  };
}

export function passwordIsValid(p: string): boolean {
  const r = evaluatePassword(p);
  return r.minLength && r.hasUpper && r.hasLower && r.hasSpecial;
}

const RULES: { key: keyof PasswordRules; label: string }[] = [
  { key: "minLength", label: "At least 8 characters" },
  { key: "hasUpper", label: "An uppercase letter (A–Z)" },
  { key: "hasLower", label: "A lowercase letter (a–z)" },
  { key: "hasSpecial", label: "A special character (e.g. !@#$%)" },
];

/**
 * Live password-requirements checklist. Renders ✓ (met) or empty (not met)
 * next to each rule as the user types. `touched` controls whether the unmet
 * rules show in error red (so a pristine empty input doesn't look alarming).
 */
export function PasswordChecklist({
  password,
  touched = true,
}: {
  password: string;
  touched?: boolean;
}) {
  const r = evaluatePassword(password);
  return (
    <ul className="space-y-1 text-label-sm">
      {RULES.map(({ key, label }) => {
        const met = r[key];
        const color = met
          ? "text-primary"
          : touched && password.length > 0
            ? "text-error"
            : "text-on-surface-variant";
        return (
          <li key={key} className={`flex items-center gap-2 ${color}`}>
            <span aria-hidden className="inline-block w-4 text-center">
              {met ? "✓" : "•"}
            </span>
            <span>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}
