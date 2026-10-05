import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { CvLoading } from '@/components/cv/cv-ui';

/**
 * Le contenu du dashboard (score + suggestions + sections) a été déplacé sur
 * `/icv` (l'accueil iCV). Cette route est conservée pour les éventuels liens
 * existants : on redirige immédiatement.
 */
export default function ICVDashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/icv' as never);
  }, [router]);
  return <CvLoading title="iCV" />;
}
