"use client";

import { useActionState, useState } from "react";
import {
  updateProfile,
  changePassword,
  type UpdateProfileState,
  type ChangePasswordState,
} from "./actions";
import { FLEET_SIZES, STATES } from "@/lib/profile-options";

const PROFILE_INITIAL: UpdateProfileState = { ok: false };
const PASSWORD_INITIAL: ChangePasswordState = { ok: false };

type Props = {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  state: string;
  fleetSize: string;
};

export default function AccountForm({
  email,
  firstName,
  lastName,
  companyName,
  state: stateCode,
  fleetSize,
}: Props) {
  return (
    <div className="account-stack">
      <ProfileSection
        email={email}
        firstName={firstName}
        lastName={lastName}
        companyName={companyName}
        stateCode={stateCode}
        fleetSize={fleetSize}
      />
      <PasswordSection />
    </div>
  );
}

function ProfileSection({
  email,
  firstName,
  lastName,
  companyName,
  stateCode,
  fleetSize,
}: {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  stateCode: string;
  fleetSize: string;
}) {
  const [state, action, pending] = useActionState(
    updateProfile,
    PROFILE_INITIAL
  );

  // Per-form dirty flag. Cleared when a save lands; flipped back on as
  // soon as the user types, which hides the success line. Scoped here so
  // editing the password form has no effect on this success state.
  const [dirty, setDirty] = useState(false);
  // Identity-track useActionState's state object: a new object means a new
  // submission result, so reset dirty during render rather than in an effect.
  const [latestState, setLatestState] = useState(state);
  if (state !== latestState) {
    setLatestState(state);
    if (state.ok) setDirty(false);
  }

  const fe = "fieldErrors" in state ? state.fieldErrors ?? {} : {};
  const formErr = "error" in state ? state.error : undefined;
  const showOk = state.ok && !dirty;

  const onChange = () => {
    if (!dirty) setDirty(true);
  };

  return (
    <section className="form-card">
      <div className="account-card-head">
        <h2>Profile</h2>
        <p>Your name, company, and operating context.</p>
      </div>

      {formErr && <div className="form-err">{formErr}</div>}

      <form action={action} className="form-body" onChange={onChange}>
        <div className="fi">
          <label htmlFor="account_email">Business email</label>
          <input
            id="account_email"
            type="email"
            value={email}
            disabled
            readOnly
          />
          <div className="fi-help">
            Contact support to change your email address.
          </div>
        </div>

        <div className="fi-row">
          <div className="fi">
            <label htmlFor="first_name">First name</label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              autoComplete="given-name"
              defaultValue={firstName}
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
              defaultValue={lastName}
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
            defaultValue={companyName}
            required
          />
          {fe.company_name && <div className="fi-err">{fe.company_name}</div>}
        </div>

        <div className="fi-row">
          <div className="fi">
            <label htmlFor="state">State</label>
            <select id="state" name="state" defaultValue={stateCode} required>
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
              defaultValue={fleetSize}
              required
            >
              {FLEET_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size === "100+" ? "100+ trucks" : `${size} trucks`}
                </option>
              ))}
            </select>
            {fe.fleet_size && <div className="fi-err">{fe.fleet_size}</div>}
          </div>
        </div>

        <button type="submit" className="bf p" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>

        {showOk && (
          <div className="form-ok" role="status">
            Profile updated.
          </div>
        )}
      </form>
    </section>
  );
}

function PasswordSection() {
  const [state, action, pending] = useActionState(
    changePassword,
    PASSWORD_INITIAL
  );

  const [dirty, setDirty] = useState(false);
  // resetKey forces the three password inputs to remount and clear after a
  // successful change. Bumping a key is the React-idiomatic uncontrolled-
  // input reset.
  const [resetKey, setResetKey] = useState(0);
  const [latestState, setLatestState] = useState(state);
  if (state !== latestState) {
    setLatestState(state);
    if (state.ok) {
      setDirty(false);
      setResetKey((k) => k + 1);
    }
  }

  const fe = "fieldErrors" in state ? state.fieldErrors ?? {} : {};
  const formErr = "error" in state ? state.error : undefined;
  const showOk = state.ok && !dirty;

  const onChange = () => {
    if (!dirty) setDirty(true);
  };

  return (
    <section className="form-card">
      <div className="account-card-head">
        <h2>Password</h2>
        <p>Current password required to change.</p>
      </div>

      {formErr && <div className="form-err">{formErr}</div>}

      <form action={action} className="form-body" onChange={onChange}>
        <div className="fi">
          <label htmlFor="current_password">Current password</label>
          <input
            key={`current-${resetKey}`}
            id="current_password"
            name="current_password"
            type="password"
            autoComplete="current-password"
            required
          />
          {fe.current_password && (
            <div className="fi-err">{fe.current_password}</div>
          )}
        </div>

        <div className="fi">
          <label htmlFor="new_password">New password</label>
          <input
            key={`new-${resetKey}`}
            id="new_password"
            name="new_password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <div className="fi-help">At least 8 characters.</div>
          {fe.new_password && <div className="fi-err">{fe.new_password}</div>}
        </div>

        <div className="fi">
          <label htmlFor="confirm_password">Confirm new password</label>
          <input
            key={`confirm-${resetKey}`}
            id="confirm_password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          {fe.confirm_password && (
            <div className="fi-err">{fe.confirm_password}</div>
          )}
        </div>

        <button type="submit" className="bf p" disabled={pending}>
          {pending ? "Updating…" : "Change password"}
        </button>

        {showOk && (
          <div className="form-ok" role="status">
            Password updated.
          </div>
        )}
      </form>
    </section>
  );
}
