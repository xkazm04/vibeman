import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Helper to modify URL search params and navigate
 */
function updateUrlParam(router: ReturnType<typeof useRouter>, key: string, value: string | null) {
  const currentUrl = new URL(window.location.href);

  if (value !== null) {
    currentUrl.searchParams.set(key, value);
  } else {
    currentUrl.searchParams.delete(key);
  }

  router.push(currentUrl.toString(), { scroll: false });
}

export const useContextDetail = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Check URL params on mount and when they change
  useEffect(() => {
    const groupId = searchParams.get('groupDetail');
    if (groupId) {
      setSelectedGroupId(groupId);
      setIsDetailOpen(true);
    } else {
      setIsDetailOpen(false);
      setSelectedGroupId(null);
    }
  }, [searchParams]);

  const openGroupDetail = (groupId: string) => {
    updateUrlParam(router, 'groupDetail', groupId);
  };

  const closeGroupDetail = () => {
    updateUrlParam(router, 'groupDetail', null);
  };

  return {
    isDetailOpen,
    selectedGroupId,
    openGroupDetail,
    closeGroupDetail
  };
};