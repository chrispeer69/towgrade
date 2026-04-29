"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginOperator, type LoginState } from "./actions";

const INITIAL: LoginState = { ok: false };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginOperator, INITIAL);

  const formErr = state.error;

  return (
    <>
      {formErr && <div className="form-err">{formErr}</div>}

      <form action={formAction} className="form-body">
        <div className="fi">
          <label htmlFor="email">Business email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="john@abctowing.com"
            defaultValue={state.email ?? ""}
            required
          />
        </div>

        <div className="fi">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            required
          />
        </div>

        <button type="submit" className="bf p" disabled={pending}>
          {pending ? "Signing in…" : "Sign In"}
        </button>

        <div className="dl">new to TowGrade?</div>
        <Link href="/register" className="bf">
          Register here
        </Link>
      </form>
    </>
  );
}
