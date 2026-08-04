import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi, type ProfileRequest, type ProfileResponse } from '../api/profile.api';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';

export function useProfile() {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuth();
  const { language, setLanguage } = useI18n();

  const {
    data: profile,
    isLoading,
    error,
    refetch
  } = useQuery<ProfileResponse>({
    queryKey: ['profile'],
    queryFn: async () => {
      return await profileApi.getMyProfile();
    }
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
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['profile'], updatedProfile);
      document.documentElement.classList.toggle('dark', updatedProfile.theme === 'dark');

      const profileLanguage = updatedProfile.language === 'en' ? 'en' : 'es';
      updateUser({
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
        language: profileLanguage,
      });
      setLanguage(profileLanguage);
    }
  });

  return {
    profile,
    isLoading,
    error: error ? (error as any).response?.data?.message || 'Error al cargar el perfil' : null,
    refetch,
    updateProfile: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending
  };
}
