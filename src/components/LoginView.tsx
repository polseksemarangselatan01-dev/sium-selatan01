import { FormEvent, useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  User,
} from 'lucide-react';
import { RosterOrgHeader } from '../types/polriRoster';
import {
  DashboardUserSession,
  DEFAULT_LOGIN_PASSWORD,
  DEFAULT_LOGIN_USERNAME,
  isUsingDefaultCredentialsSync,
  verifyLogin,
} from '../utils/dashboardAuth';
import { PolriCrestSvg } from './PolriCrestSvg';

interface LoginViewProps {
  header: RosterOrgHeader;
  totalPersonnel: number;
  onLoginSuccess: (session: DashboardUserSession) => void;
}

export function LoginView({
  header,
  totalPersonnel,
  onLoginSuccess,
}: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const showDefaultHint = isUsingDefaultCredentialsSync();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await verifyLogin(username, password, remember);
      if (result.ok) {
        onLoginSuccess(result.session);
      } else {
        setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillDefault = () => {
    setUsername(DEFAULT_LOGIN_USERNAME);
    setPassword(DEFAULT_LOGIN_PASSWORD);
    setError(null);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a1529] text-white flex items-center justify-center p-4 sm:p-6">
      {/* Atmospheric Twilight & Ceremonial Backdrop (100% Offline Vector/CSS) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/* Sky twilight gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 22% 72%, rgba(168, 114, 58, 0.34) 0%, rgba(28, 49, 86, 0.72) 45%, rgba(9, 19, 39, 0.96) 100%)',
          }}
        />
        {/* Subtle Ceremonial Merah-Putih Flag Silhouette on Top-Left */}
        <svg
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full opacity-40"
        >
          {/* Flag Pole */}
          <rect x="132" y="70" width="8" height="730" fill="#cbd5e1" fillOpacity="0.45" />
          <circle cx="136" cy="64" r="10" fill="#d4a253" fillOpacity="0.8" />
          {/* Flag Red Stripe */}
          <path
            d="M140 90 C280 72, 410 122, 560 98 L560 228 C410 250, 280 200, 140 218 Z"
            fill="#991b1b"
            fillOpacity="0.72"
          />
          {/* Flag White Stripe */}
          <path
            d="M140 218 C280 200, 410 250, 560 228 L560 356 C410 378, 280 328, 140 346 Z"
            fill="#e2e8f0"
            fillOpacity="0.58"
          />
          {/* Architectural Mako Building Silhouette */}
          <rect x="640" y="390" width="560" height="410" fill="#1e2433" fillOpacity="0.65" />
          <rect x="620" y="368" width="600" height="24" fill="#3a2f24" fillOpacity="0.7" />
          <g fill="#fbbf24" fillOpacity="0.16">
            <rect x="690" y="430" width="44" height="58" rx="2" />
            <rect x="760" y="430" width="44" height="58" rx="2" />
            <rect x="830" y="430" width="44" height="58" rx="2" />
            <rect x="900" y="430" width="44" height="58" rx="2" />
            <rect x="970" y="430" width="44" height="58" rx="2" />
            <rect x="1040" y="430" width="44" height="58" rx="2" />
            <rect x="690" y="518" width="44" height="58" rx="2" />
            <rect x="760" y="518" width="44" height="58" rx="2" />
            <rect x="830" y="518" width="44" height="58" rx="2" />
            <rect x="900" y="518" width="44" height="58" rx="2" />
          </g>
        </svg>
        {/* Subtle dark vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(8,15,31,0.35) 0%, rgba(8,15,31,0.55) 100%)',
          }}
        />
      </div>

      {/* Centered Translucent Dark Navy Glass Login Card */}
      <div className="relative z-10 w-full max-w-[400px] rounded-2xl border border-[#2a416b]/70 bg-[#0d1930]/88 backdrop-blur-md px-6 py-8 sm:px-8 sm:py-9 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <PolriCrestSvg className="w-24 h-24 drop-shadow" />

          <h1 className="mt-3 text-2xl sm:text-[26px] font-bold tracking-tight text-white">
            SEKSI UMUM
          </h1>

          <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
            {header.line3.replace(/\bSEKTOR\b/gi, 'POLSEK')}
          </p>

          <div className="my-5 h-[2px] w-10 rounded-full bg-[#c99645]" />

          <p className="max-w-[265px] text-xs leading-relaxed text-slate-300">
            Silakan masukkan username dan password untuk masuk ke dashboard
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2 rounded-lg border border-red-400/40 bg-red-950/70 px-3.5 py-2.5 text-xs text-red-200"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="login-username"
              className="block text-xs font-medium text-slate-200"
            >
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full rounded-lg border border-[#264170] bg-[#0b172c]/90 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-[#c99645] focus:outline-none focus:ring-2 focus:ring-[#c99645]/25"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="login-password"
              className="block text-xs font-medium text-slate-200"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full rounded-lg border border-[#264170] bg-[#0b172c]/90 pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-[#c99645] focus:outline-none focus:ring-2 focus:ring-[#c99645]/25"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 rounded"
                aria-label={
                  showPassword ? 'Sembunyikan password' : 'Tampilkan password'
                }
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none pt-0.5">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-[#315085] bg-[#0b172c] text-[#b48344] focus:ring-[#c99645]"
            />
            <span className="text-xs text-slate-300">
              Ingat sesi login di perangkat ini
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#a6783e] hover:bg-[#b88647] disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white transition-colors whitespace-nowrap"
          >
            <LogIn className="w-4 h-4 shrink-0" />
            <span>{submitting ? 'Memeriksa...' : 'Masuk'}</span>
          </button>
        </form>

        {showDefaultHint && (
          <div className="mt-5 pt-4 border-t border-[#233860] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <div>
              <span className="text-slate-400">Default: </span>
              <span className="font-mono text-white">
                {DEFAULT_LOGIN_USERNAME}
              </span>
              <span className="text-slate-500 mx-1">/</span>
              <span className="font-mono text-white">
                {DEFAULT_LOGIN_PASSWORD}
              </span>
            </div>
            <button
              type="button"
              onClick={handleFillDefault}
              className="font-semibold text-[#e2b46b] hover:text-[#f0c783] whitespace-nowrap"
            >
              Isi Otomatis
            </button>
          </div>
        )}

        <div className="mt-4 text-center text-[11px] font-mono text-slate-400">
          {header.line2} · {totalPersonnel} Personel · Luring Siap Pakai
        </div>
      </div>
    </div>
  );
}
