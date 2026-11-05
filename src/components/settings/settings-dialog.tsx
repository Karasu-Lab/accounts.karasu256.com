'use client';

import * as React from 'react';
import { Check, LoaderCircle, Pencil, X, type LucideIcon } from 'lucide-react';
import { Button, Dialog, DialogBackdrop, DialogPopup, DialogPortal, DialogTitle, Input, R2Image } from '@karasu-lab/ui';
import { cn } from '@/lib/utils';
import { EditValueDialog } from './edit-value-dialog';
import { SettingsItemContainer, SettingsItemGroup, SettingsItemIconButton } from './settings-item-container';

export interface SettingsDialogAvatarSpec {
  src?: string | null;
  uploading?: boolean;
  accept: string;
  onPick: (file: File) => void;
}

export interface SettingsDialogValueEditSpec {
  value: string;
  multiline?: boolean;
  placeholder?: string;
  autoComplete?: string;
  onSave: (value: string) => void;
}

export interface SettingsDialogFieldSpec {
  key: string;
  title: string;
  icon?: LucideIcon;
  iconBackgroundColor?: string;
  disabled?: boolean;
  description?: string;
  avatar?: SettingsDialogAvatarSpec;
  trailing?: React.ReactNode;
  content?: React.ReactNode;
  edit?: SettingsDialogValueEditSpec;
}

export interface SettingsDialogSpec {
  title: string;
  fields: SettingsDialogFieldSpec[];
  running?: boolean;
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimary: () => void | Promise<void>;
  cancelLabel: string;
  editorSaveLabel: string;
  editorCancelLabel: string;
}

export function SettingsDialog({ spec, open, onOpenChange, done }: { spec: SettingsDialogSpec; open: boolean; onOpenChange: (open: boolean) => void; done?: React.ReactNode }) {
  const [editKey, setEditKey] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const avatarField = spec.fields.find((f) => f.avatar);
  const editingField = editKey !== null ? spec.fields.find((f) => f.key === editKey) : undefined;
  const multilineEditing = editingField?.edit.multiline ?? false;

  React.useEffect(() => {
    if (!open) setEditKey(null);
  }, [open]);

  function beginEdit(field: SettingsDialogFieldSpec) {
    if (!field.edit) return;
    setDraft(field.edit.value);
    setEditKey(field.key);
  }

  function commitEdit() {
    if (editingField?.edit) editingField.edit.onSave(draft);
    setEditKey(null);
  }

  function cancelEdit() {
    setEditKey(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && spec.running) return;
        onOpenChange(next);
      }}
    >
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-lg w-full p-6 space-y-4 max-h-[90dvh] overflow-y-auto">
          <DialogTitle>{spec.title}</DialogTitle>

          {done ? (
            done
          ) : (
            <>
              <div aria-disabled={spec.running || undefined} className={cn('space-y-3', spec.running && 'pointer-events-none opacity-50')}>
                <SettingsItemGroup>
                  {spec.fields.map((field) => {
                    const inlineEditing = editKey === field.key && !field.edit?.multiline;
                    return (
                      <SettingsItemContainer
                        key={field.key}
                        title={field.title}
                        description={inlineEditing ? undefined : field.description}
                        icon={field.icon}
                        iconImageSrc={!field.avatar?.uploading ? (field.avatar?.src ?? undefined) : undefined}
                        iconNode={
                          field.avatar?.uploading ? (
                            <span className="relative block size-full">
                              {field.avatar?.src && <R2Image src={field.avatar.src} alt="" className="size-full object-cover" />}
                              <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                                <LoaderCircle className="size-4 animate-spin" />
                              </span>
                            </span>
                          ) : undefined
                        }
                        iconBackgroundColor={field.iconBackgroundColor}
                        disabled={field.disabled}
                        onClick={field.avatar ? () => fileInputRef.current?.click() : undefined}
                        trailing={
                          inlineEditing ? (
                            <span className="flex items-center gap-1">
                              <SettingsItemIconButton label={spec.editorSaveLabel} icon={Check} onClick={commitEdit} />
                              <SettingsItemIconButton label={spec.editorCancelLabel} icon={X} onClick={cancelEdit} />
                            </span>
                          ) : (
                            field.trailing ??
                            (field.edit ? (
                              <SettingsItemIconButton label={field.title} icon={Pencil} onClick={() => beginEdit(field)} />
                            ) : undefined)
                          )
                        }
                      >
                        {inlineEditing ? (
                          <Input
                            value={draft}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
                            disabled={spec.running}
                            autoComplete={field.edit?.autoComplete}
                            autoFocus
                            className="h-7 py-1"
                          />
                        ) : (
                          field.content
                        )}
                      </SettingsItemContainer>
                    );
                  })}
                </SettingsItemGroup>
                {avatarField && (
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={avatarField.avatar!.accept}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) avatarField.avatar!.onPick(file);
                    }}
                  />
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={spec.running}>
                  {spec.cancelLabel}
                </Button>
                <Button
                  type="button"
                  disabled={spec.running || spec.primaryDisabled}
                  onClick={() => void spec.onPrimary()}
                >
                  {spec.running && <LoaderCircle className="size-4 animate-spin" />}
                  {spec.primaryLabel}
                </Button>
              </div>
            </>
          )}
        </DialogPopup>
      </DialogPortal>
      {multilineEditing && editingField && (
        <EditValueDialog
          open={editKey !== null}
          onOpenChange={(o) => {
            if (!o) setEditKey(null);
          }}
          label={editingField.title}
          value={editingField.edit.value}
          multiline={editingField.edit.multiline}
          placeholder={editingField.edit.placeholder}
          autoComplete={editingField.edit.autoComplete}
          onSave={editingField.edit.onSave}
          saveLabel={spec.editorSaveLabel}
          cancelLabel={spec.editorCancelLabel}
        />
      )}
    </Dialog>
  );
}
