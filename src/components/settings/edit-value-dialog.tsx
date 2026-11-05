'use client';

import { useEffect, useState } from 'react';
import { Button, Dialog, DialogBackdrop, DialogPopup, DialogPortal, DialogTitle, Input, Label } from '@karasu-lab/ui';
import { LoadingButton } from '@/components/ui/loading-button';

export interface EditValueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  value: string;
  /** Edits the value in a multi-line textarea instead of a single-line input. */
  multiline?: boolean;
  placeholder?: string;
  onSave: (value: string) => void | Promise<void>;
  saveLabel: string;
  cancelLabel: string;
  autoComplete?: string;
}

export function EditValueDialog({ open, onOpenChange, label, value, multiline = false, placeholder, onSave, saveLabel, cancelLabel, autoComplete }: EditValueDialogProps) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

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
              {multiline ? (
                <textarea
                  id="edit-value-input"
                  value={draft}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
                  rows={4}
                  placeholder={placeholder}
                  disabled={saving}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  autoFocus
                />
              ) : (
                <Input
                  id="edit-value-input"
                  value={draft}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
                  placeholder={placeholder}
                  disabled={saving}
                  autoComplete={autoComplete}
                  autoFocus
                />
              )}
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
