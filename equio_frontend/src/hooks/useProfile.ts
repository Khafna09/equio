import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '../utils/apiError';
import { profileApi, type ProfileRequest, type ProfileResponse } from '../api/profile.api';
import { useAuth } from '../contexts/authContextValue';
import { useEffect } from 'react';
import { useI18n } from '../i18n/i18nContextValue';
import { queryKeys, queryStaleTimes } from '../api/queryCache';

export function useProfile() {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuth();
  const { language, setLanguage, t } = useI18n();

  const {
    data: profile,
    isLoading,
    error,
    refetch
  } = useQuery<ProfileResponse>({
    queryKey: queryKeys.profile.root,
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
    mutationFn: async (data: ProfileRequest) => {
      return await profileApi.updateMyProfile(data);
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.profile.root });
      queryClient.setQueryData<ProfileResponse>(queryKeys.profile.root, (current) =>
        current ? { ...current, ...data } : current
      );
    },
    onSuccess: (updatedProfile, data) => {
      const current = queryClient.getQueryData<ProfileResponse>(queryKeys.profile.root);
      const mergedProfile = { ...updatedProfile, ...current, ...data };
      queryClient.setQueryData(queryKeys.profile.root, mergedProfile);
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
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.root });
    }
  });

  return {
    profile,
    isLoading,
    error: error ? getApiErrorMessage(error, t('common.loadProfileError')) : null,
    refetch,
    updateProfile: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending
  };
}
