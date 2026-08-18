"use client";

import { logoutAllDevicesAction } from "@/app/actions";

export function LogoutAllDevicesButton() {
  return (
    <form
      action={logoutAllDevicesAction}
      className="mt-4"
      onSubmit={(e) => {
        if (!confirm("Déconnecter votre compte de tous les appareils ?")) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="btn-danger text-sm">
        Déconnecter tous les appareils
      </button>
    </form>
  );
}
