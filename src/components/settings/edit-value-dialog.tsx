'use client';

import { useEffect, useState } from 'react';
import { Button, Dialog, DialogBackdrop, DialogPopup, DialogPortal, DialogTitle, Input, Label } from '@karasu-lab/ui';
import { LoadingButton } from '@/components/ui/loading-button';

export interface EditValueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Title of the dialog, doubling as the edited value's label. */
  label: string;
  /** The value the editor starts from each time the dialog opens. */
  value: string;
  /**
   * Called with the edited value when the user chooses Save. The dialog
   * stays in its saving state until the returned promise settles, and
   * closes only when it resolves; when it rejects, the dialog stays open
   * so the user can retry or cancel (reporting the error is the caller's
   * job).
   */
  onSave: (value: string) => void | Promise<void>;
  saveLabel: string;
  cancelLabel: string;
  /** Forwarded to the text input, e.g. `name` for a display name. */
  autoComplete?: string;
}

/**
 * A generic dialog for editing a single text value: the user edits the
 * value in a text input and then chooses Save to apply it or Cancel to
 * discard it. Cancelling — including closing the dialog any other way —
 * never calls `onSave`.
 */
export function EditValueDialog({ open, onOpenChange, label, value, onSave, saveLabel, cancelLabel, autoComplete }: EditValueDialogProps) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  /* Each opening starts from the current value, discarding any draft a cancelled edit left behind. */
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(draft);
      onOpenChange(false);
    } catch {
      /* The caller has already reported the error; keep the dialog open. */
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <DialogTitle>{label}</DialogTitle>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-1">
              <Label htmlFor="edit-value-input" className="sr-only">
                {label}
              </Label>
              <Input
                id="edit-value-input"
                value={draft}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
                disabled={saving}
                autoComplete={autoComplete}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                {cancelLabel}
              </Button>
              <LoadingButton type="submit" loading={saving} disabled={saving}>
                {saveLabel}
              </LoadingButton>
            </div>
          </form>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
