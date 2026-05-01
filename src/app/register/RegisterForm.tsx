"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerOperator, type RegisterState } from "./actions";
import { FLEET_SIZES, STATES } from "@/lib/profile-options";

const INITIAL: RegisterState = { ok: false };

export default function RegisterForm({
  callbackError,
}: {
  callbackError?: string;
}) {
  const [state, formAction, pending] = useActionState(
    registerOperator,
    INITIAL
  );

  if (state.ok) {
    return (
      <div className="form-success">
        <div className="form-success-mark" aria-hidden>
          ✓
        </div>
        <h2>Check your email</h2>
        <p>
          We&apos;ve sent a confirmation link to{" "}
          <strong>{state.email}</strong>. Click it to finish setting up your
          account — you&apos;ll land on your dashboard once it&apos;s verified.
        </p>
        <p style={{ fontSize: 12, color: "var(--ink-30)", marginTop: 12 }}>
          The email may take a minute. Check your spam folder if you don&apos;t
          see it.
        </p>
      </div>
    );
  }

  const fe = "fieldErrors" in state ? state.fieldErrors ?? {} : {};
  const formErr =
    callbackError ?? ("error" in state ? state.error : undefined);

  return (
    <>
      {formErr && <div className="form-err">{formErr}</div>}

      <form action={formAction} className="form-body">
        <div className="ib">
          🔒 TowGrade never shares your company name or contact information
          with any roadside assistance provider. Public data is anonymized to
          region and fleet size only.
        </div>

        <div className="fi-row">
          <div className="fi">
            <label htmlFor="first_name">First name</label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              autoComplete="given-name"
              placeholder="John"
              required
            />
            {fe.first_name && <div className="fi-err">{fe.first_name}</div>}
          </div>
          <div className="fi">
            <label htmlFor="last_name">Last name</label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              autoComplete="family-name"
              placeholder="Doe"
              required
            />
            {fe.last_name && <div className="fi-err">{fe.last_name}</div>}
          </div>
        </div>

        <div className="fi">
          <label htmlFor="company_name">Company name</label>
          <input
            id="company_name"
            name="company_name"
            type="text"
            autoComplete="organization"
            placeholder="ABC Towing & Recovery LLC"
            required
          />
          {fe.company_name && <div className="fi-err">{fe.company_name}</div>}
        </div>

        <div className="fi-row">
          <div className="fi">
            <label htmlFor="state">State</label>
            <select id="state" name="state" defaultValue="" required>
              <option value="" disabled>
                — Select —
              </option>
              {STATES.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
            {fe.state && <div className="fi-err">{fe.state}</div>}
          </div>
          <div className="fi">
            <label htmlFor="fleet_size">Fleet size</label>
            <select
              id="fleet_size"
              name="fleet_size"
              defaultValue=""
              required
            >
              <option value="" disabled>
                — Select —
              </option>
              {FLEET_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size === "100+" ? "100+ trucks" : `${size} trucks`}
                </option>
              ))}
            </select>
            {fe.fleet_size && <div className="fi-err">{fe.fleet_size}</div>}
          </div>
        </div>

        <div className="fi">
          <label htmlFor="email">Business email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="john@abctowing.com"
            required
          />
          {fe.email && <div className="fi-err">{fe.email}</div>}
        </div>

        <div className="fi">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a secure password"
            minLength={8}
            required
          />
          <div className="fi-help">At least 8 characters.</div>
          {fe.password && <div className="fi-err">{fe.password}</div>}
        </div>

        <button type="submit" className="bf p" disabled={pending}>
          {pending ? "Creating account…" : "Create account →"}
        </button>

        <div className="dl">already have an account?</div>
        <Link href="#" className="bf">
          Sign in instead
        </Link>
      </form>
    </>
  );
}
