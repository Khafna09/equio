import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '../utils/apiError';
import { profileApi, type ProfileRequest, type ProfileResponse } from '../api/profile.api';
import { useAuth } from '../contexts/authContextValue';
import { useEffect } from 'react';
import { useI18n } from '../i18n/i18nContextValue';
import { privateQueryKey, queryKeys, queryStaleTimes } from '../api/queryCache';
import { getSessionVersion } from '../api/tokenStore';
import { CanceledError } from 'axios';

export function useProfile() {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuth();
  const profileKey = privateQueryKey(user?.id, queryKeys.profile.root);
  const { language, setLanguage, t } = useI18n();

  const {
    data: profile,
    isLoading,
    error,
    refetch
  } = useQuery<ProfileResponse>({
    queryKey: profileKey,
    enabled: Boolean(user),
    queryFn: profileApi.getMyProfile,
    staleTime: queryStaleTimes.profile,
  });

  useEffect(() => {
    if (!profile) return;

    document.documentElement.classList.toggle('dark', profile.theme === 'dark');

    const profileLanguage = profile.language === 'en' ? 'en' : 'es';
    if (language !== profileLanguage) {
      setLanguage(profileLanguage);
    }

    const userNeedsUpdate =
      user?.firstName !== profile.firstName ||
      user?.lastName !== profile.lastName ||
      user?.language !== profileLanguage;

    if (userNeedsUpdate) {
      updateUser({
        firstName: profile.firstName,
        lastName: profile.lastName,
        language: profileLanguage,
      });
    }
  }, [language, profile, setLanguage, updateUser, user?.firstName, user?.language, user?.lastName]);

  const updateMutation = useMutation({
    mutationFn: async ({ data, sessionVersion }: { data: ProfileRequest; sessionVersion: number }) => {
      if (sessionVersion !== getSessionVersion()) throw new CanceledError('Session changed');
      const profile = await profileApi.updateMyProfile(data);
      return { profile, sessionVersion };
    },
    onMutate: async ({ data, sessionVersion }) => {
      await queryClient.cancelQueries({ queryKey: profileKey });
      if (sessionVersion !== getSessionVersion()) throw new CanceledError('Session changed');
      queryClient.setQueryData<ProfileResponse>(profileKey, (current) =>
        current ? { ...current, ...data } : current
      );
    },
    onSuccess: ({ profile: updatedProfile, sessionVersion }, { data }) => {
      if (sessionVersion !== getSessionVersion()) return;
      const current = queryClient.getQueryData<ProfileResponse>(profileKey);
      const mergedProfile = { ...updatedProfile, ...current, ...data };
      queryClient.setQueryData(profileKey, mergedProfile);
      document.documentElement.classList.toggle('dark', mergedProfile.theme === 'dark');

      const profileLanguage = mergedProfile.language === 'en' ? 'en' : 'es';
      updateUser({
        firstName: mergedProfile.firstName,
        lastName: mergedProfile.lastName,
        language: profileLanguage,
      });
      setLanguage(profileLanguage);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: profileKey });
    }
  });

  return {
    profile,
    isLoading,
    error: error ? getApiErrorMessage(error, t('common.loadProfileError'), t) : null,
    refetch,
    updateProfile: async (data: ProfileRequest) => (await updateMutation.mutateAsync({ data, sessionVersion: getSessionVersion() })).profile,
    isUpdating: updateMutation.isPending
  };
}
