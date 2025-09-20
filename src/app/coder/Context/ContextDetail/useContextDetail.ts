import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('groupDetail', groupId);
    router.push(currentUrl.toString(), { scroll: false });
  };

  const closeGroupDetail = () => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('groupDetail');
    router.push(currentUrl.toString(), { scroll: false });
  };

  return {
    isDetailOpen,
    selectedGroupId,
    openGroupDetail,
    closeGroupDetail
  };
};