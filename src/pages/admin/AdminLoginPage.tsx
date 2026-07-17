import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../hooks/useI18n';
import { authErrorMessage } from '../../services/authErrors';
import { signInAdmin, supabaseConfigured } from '../../services/supabase';
import { BrandLogo } from '../../components/BrandLogo';

export function AdminLoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await signInAdmin(email, password);
      navigate('/admin/exercises');
    } catch (reason) {
      setError(authErrorMessage(reason, (key) => t(key)));
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <section className="card w-full max-w-md">
        <BrandLogo variant="wordmark" className="mx-auto mb-6 h-16 w-60" />
        <Link className="mb-5 inline-flex min-h-11 items-center gap-2 font-bold text-slate-400" to="/settings">
          <ArrowLeft className="directional-icon" size={18} />
          {t('backToApp')}
        </Link>
        <p className="eyebrow">{t('admin')}</p>
        <h1 className="mt-2 text-3xl font-black">{t('login')}</h1>
        {!supabaseConfigured && <p role="alert" className="mt-4 rounded-2xl bg-orange-500/10 p-4 text-orange-200">{t('missingConfig')}</p>}
        <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <label><span className="label">{t('email')}</span><input dir="ltr" type="email" autoComplete="username" className="field text-left" value={email} onChange={(event) => { setEmail(event.target.value); setError(''); }} /></label>
          <label><span className="label">{t('password')}</span><input dir="ltr" type="password" autoComplete="current-password" className="field text-left" value={password} onChange={(event) => { setPassword(event.target.value); setError(''); }} /></label>
          <p aria-live="assertive" className="min-h-6 break-words text-start text-sm font-semibold text-red-400">{error}</p>
          <button type="submit" disabled={!supabaseConfigured || !email || !password || loading} className="btn-primary w-full">{loading ? t('signingIn') : t('signIn')}</button>
        </form>
      </section>
    </main>
  );
}
