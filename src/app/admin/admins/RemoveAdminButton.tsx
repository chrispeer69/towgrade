"use client";

import { useTransition } from "react";
import { removeAdmin } from "./actions";

export default function RemoveAdminButton({
  adminId,
  email,
}: {
  adminId: string;
  email: string;
}) {
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    if (
      !window.confirm(`Remove ${email} as admin? This cannot be undone.`)
    ) {
      return;
    }
    startTransition(async () => {
      const result = await removeAdmin(adminId);
      if (result?.error) window.alert(result.error);
    });
  };

  return (
    <button
      type="button"
      className="bf admin-btn admin-btn--deny"
      onClick={onClick}
      disabled={pending}
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
