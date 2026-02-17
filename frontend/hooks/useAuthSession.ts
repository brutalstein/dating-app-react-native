import { useEffect, useState } from 'react';
import { getAuthSnapshot, subscribeAuthSession } from '@/services/authSession';

export function useAuthSession() {
  const [snapshot, setSnapshot] = useState(getAuthSnapshot());

  useEffect(() => subscribeAuthSession(setSnapshot), []);

  return snapshot;
}
