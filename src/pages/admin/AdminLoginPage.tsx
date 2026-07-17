import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../hooks/useI18n';
import { signInAdmin, supabaseConfigured } from '../../services/supabase';

export function AdminLoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await signInAdmin(email, password);
      navigate('/admin/exercises');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <section className="card w-full max-w-md">
        <p className="eyebrow">{t('admin')}</p>
        <h1 className="mt-2 text-3xl font-black">{t('login')}</h1>
        {!supabaseConfigured && <p role="alert" className="mt-4 rounded-2xl bg-orange-500/10 p-4 text-orange-200">{t('missingConfig')}</p>}
        <div className="mt-6 space-y-4">
          <label><span className="label">{t('email')}</span><input dir="ltr" type="email" autoComplete="username" className="field" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label><span className="label">{t('password')}</span><input dir="ltr" type="password" autoComplete="current-password" className="field" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p role="alert" className="text-red-400">{error}</p>}
          <button disabled={!supabaseConfigured || !email || !password || loading} className="btn-primary w-full" onClick={submit}>{loading ? t('loading') : t('signIn')}</button>
        </div>
      </section>
    </main>
  );
}
