"use client";

import type { ReactNode } from "react";

export default function ConfirmForm({
  action,
  fields = {},
  label,
  className = "btn danger sm",
  message = "Are you sure you want to delete this?",
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  fields?: Record<string, string>;
  label: string;
  className?: string;
  message?: string;
  children?: ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button className={className} type="submit">
        {children ?? label}
      </button>
    </form>
  );
}
