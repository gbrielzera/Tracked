import { useState } from 'react';
import { Button } from '@/components/Button';
import { signInWithGoogle } from './google';

type Props = {
  label?: string;
  link?: boolean;
  onError: (message: string | null) => void;
};

export function GoogleButton({ label = 'Continuar com o Google', link = false, onError }: Props) {
  const [busy, setBusy] = useState(false);

  const press = async () => {
    onError(null);
    setBusy(true);
    const result = await signInWithGoogle(link);
    setBusy(false);
    if (!result.ok && result.message) onError(result.message);
  };

  return <Button label={label} variant="secondary" icon="logo-google" loading={busy} onPress={press} />;
}
