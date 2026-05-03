"use client";

import { useActionState, useEffect, useRef } from "react";
import { addAdmin, type AddAdminState } from "./actions";

const INITIAL: AddAdminState = { ok: false };

export default function AddAdminForm() {
  const [state, formAction, pending] = useActionState(addAdmin, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  // Reset the input on a successful add so the user can immediately
  // type the next email without manually clearing the field.
  useEffect(() => {
    if (state.ok && formRef.current) formRef.current.reset();
  }, [state]);

  return (
    <div className="admin-card admin-add">
      <form ref={formRef} action={formAction} className="admin-add__row">
        <div className="fi admin-add__field">
          <label htmlFor="add-admin-email">Add an admin by email</label>
          <input
            id="add-admin-email"
            name="email"
            type="email"
            placeholder="someone@example.com"
            autoComplete="off"
            required
          />
          {state.ok ? (
            <div className="form-ok">Added {state.email}.</div>
          ) : state.error ? (
            <div className="fi-err">{state.error}</div>
          ) : null}
        </div>
        <button
          type="submit"
          className="bf p admin-btn admin-add__btn"
          disabled={pending}
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </form>
    </div>
  );
}
