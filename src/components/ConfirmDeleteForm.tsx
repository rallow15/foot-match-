"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

interface ConfirmDeleteFormProps {
  action: (formData: FormData) => void | Promise<void>;
  hiddenName: string;
  hiddenValue: string;
  buttonLabel?: string;
  buttonClassName?: string;
  title?: string;
  message?: string;
}

function SubmitButtons({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();
  return (
    <div className="mt-6 flex justify-end gap-3">
      <button
        type="button"
        className="btn-ghost"
        onClick={onCancel}
        disabled={pending}
      >
        Annuler
      </button>
      <button type="submit" className="btn-danger" disabled={pending}>
        {pending ? "Suppression…" : "Confirmer la suppression"}
      </button>
    </div>
  );
}

export function ConfirmDeleteForm({
  action,
  hiddenName,
  hiddenValue,
  buttonLabel = "Supprimer",
  buttonClassName = "btn-danger text-xs",
  title = "Confirmer la suppression",
  message = "Cette action est irréversible. Êtes-vous sûr de vouloir continuer ?",
}: ConfirmDeleteFormProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        onClick={() => setOpen(true)}
      >
        {buttonLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.currentTarget === e.target) setOpen(false);
          }}
        >
          <div className="card w-full max-w-md p-6">
            <h3 className="headline text-xl text-paper">{title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{message}</p>
            <form
              action={action}
              onSubmit={() => setOpen(false)}
              className="contents"
            >
              <input type="hidden" name={hiddenName} value={hiddenValue} />
              <SubmitButtons onCancel={() => setOpen(false)} />
            </form>
          </div>
        </div>
      )}
    </>
  );
}
