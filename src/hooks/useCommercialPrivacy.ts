import { useMemo } from 'react';

interface Commercial {
  id: string;
  hide_contact_info?: boolean;
}

/**
 * Hook to manage commercial privacy settings
 */
export const useCommercialPrivacy = (commercial?: Commercial | null) => {
  const shouldHideContactInfo = useMemo(() => {
    return commercial?.hide_contact_info === true;
  }, [commercial?.hide_contact_info]);

  return {
    shouldHideContactInfo,
    canUseSpeedDial: !shouldHideContactInfo,
  };
};