import { FormEvent, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  DashboardUserSession,
  DEFAULT_LOGIN_PASSWORD,
  DEFAULT_LOGIN_USERNAME,
  resetAuthToDefault,
  updateAccountCredentials,
} from '../utils/dashboardAuth';

interface AccountSettingsModalProps {
  session: DashboardUserSession;
  onClose: () => void;
  onSessionUpdated: (session: DashboardUserSession, message: string) => void;
}

export function AccountSettingsModal({
  session,
  onClose,
  onSessionUpdated,
}: AccountSettingsModalProps) {
  const [displayName, setDisplayName] = useState(session.displayName);
  const [username, setUsername] = useState(session.username);
  const [roleLabel, setRoleLabel] = useState(session.roleLabel);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmResetStep, setConfirmResetStep] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError('Masukkan kata sandi saat ini untuk memverifikasi perubahan.');
      return;
    }
    if (newPassword && newPassword !== confirmNewPassword) {
      setError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setSaving(true);
    try {
      const result = await updateAccountCredentials({
        currentPassword,
        newUsername: username,
        newDisplayName: displayName,
        newRoleLabel: roleLabel,
        newPassword: newPassword || undefined,
        remembered: session.remembered,
      });

      if (result.ok) {
        onSessionUpdated(
          result.session,
          'Pengaturan akun dan akses login berhasil diperbarui.'
        );
        onClose();
      } else {
        setError(result.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = async () => {
    setSaving(true);
    try {
      const nextSession = await resetAuthToDefault(session.remembered);
      onSessionUpdated(
        nextSession,
        `Akses login dikembalikan ke default (${DEFAULT_LOGIN_USERNAME} / ${DEFAULT_LOGIN_PASSWORD}).`
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
    >
      <div className="w-full max-w-lg bg-[#191510] border border-[#3a2f20] text-[#f3ede4] rounded-xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2f271d]">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-4 h-4 text-[#dfb365] shrink-0" />
            <h2
              id="account-modal-title"
              className="text-sm font-bold uppercase tracking-wide text-[#dfb365]"
            >
              Pengaturan Akun &amp; Keamanan Login
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#9b8f80] hover:text-[#f3ede4] rounded-lg"
            aria-label="Tutup pengaturan akun"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-400/40 bg-red-950/60 px-3 py-2.5 text-xs text-red-200"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label
                htmlFor="acc-display-name"
                className="block text-xs font-medium text-[#b8aa97]"
              >
                Nama Tampilan
              </label>
              <input
                id="acc-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#120f0b] border border-[#352b1f] text-[#f3ede4] rounded-lg focus:outline-none focus:border-[#c99645]"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="acc-role-label"
                className="block text-xs font-medium text-[#b8aa97]"
              >
                Jabatan / Peran
              </label>
              <input
                id="acc-role-label"
                type="text"
                value={roleLabel}
                onChange={(e) => setRoleLabel(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#120f0b] border border-[#352b1f] text-[#f3ede4] rounded-lg focus:outline-none focus:border-[#c99645]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="acc-username"
              className="block text-xs font-medium text-[#b8aa97]"
            >
              Username Login
            </label>
            <input
              id="acc-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono bg-[#120f0b] border border-[#352b1f] text-[#f3ede4] rounded-lg focus:outline-none focus:border-[#c99645]"
            />
          </div>

          <div className="border-t border-[#2f271d] pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#dfb365]">
                Verifikasi &amp; Ubah Kata Sandi
              </span>
              <button
                type="button"
                onClick={() => setShowPasswords((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-[#9b8f80] hover:text-[#f3ede4]"
              >
                {showPasswords ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Sembunyikan</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Tampilkan</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="acc-current-password"
                className="block text-xs font-medium text-[#b8aa97]"
              >
                Kata Sandi Saat Ini (wajib untuk menyimpan)
              </label>
              <input
                id="acc-current-password"
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Masukkan kata sandi saat ini"
                className="w-full px-3 py-2 text-sm bg-[#120f0b] border border-[#352b1f] text-[#f3ede4] placeholder:text-[#6e6456] rounded-lg focus:outline-none focus:border-[#c99645]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label
                  htmlFor="acc-new-password"
                  className="block text-xs font-medium text-[#b8aa97]"
                >
                  Kata Sandi Baru (opsional)
                </label>
                <input
                  id="acc-new-password"
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3 py-2 text-sm bg-[#120f0b] border border-[#352b1f] text-[#f3ede4] placeholder:text-[#6e6456] rounded-lg focus:outline-none focus:border-[#c99645]"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="acc-confirm-password"
                  className="block text-xs font-medium text-[#b8aa97]"
                >
                  Ulangi Kata Sandi Baru
                </label>
                <input
                  id="acc-confirm-password"
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Samakan kata sandi baru"
                  className="w-full px-3 py-2 text-sm bg-[#120f0b] border border-[#352b1f] text-[#f3ede4] placeholder:text-[#6e6456] rounded-lg focus:outline-none focus:border-[#c99645]"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-[#2f271d] pt-4 flex flex-wrap items-center justify-between gap-3">
            {!confirmResetStep ? (
              <button
                type="button"
                onClick={() => setConfirmResetStep(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9b8f80] hover:text-[#dfb365] whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Akses ke Default</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#e6bd70] font-medium">
                  Kembalikan ke {DEFAULT_LOGIN_USERNAME} / {DEFAULT_LOGIN_PASSWORD}?
                </span>
                <button
                  type="button"
                  onClick={handleResetDefault}
                  disabled={saving}
                  className="px-2.5 py-1 bg-[#a6783e] hover:bg-[#b88647] text-white rounded font-semibold whitespace-nowrap"
                >
                  Ya, Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmResetStep(false)}
                  className="px-2 py-1 text-[#9b8f80] hover:text-[#f3ede4]"
                >
                  Batal
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-[#d6cec2] bg-[#120f0b] border border-[#352b1f] hover:bg-[#221c15] rounded-lg whitespace-nowrap"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#a6783e] hover:bg-[#b88647] disabled:opacity-60 rounded-lg whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
