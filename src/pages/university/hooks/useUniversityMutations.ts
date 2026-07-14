import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createUniversity, deleteUniversity, updateUniversity } from '@/apis/university';
import { universityQueryKeys } from '@/apis/university/queries';

export function useUniversityMutations() {
  const queryClient = useQueryClient();
  const invalidateUniversities = () => queryClient.invalidateQueries({ queryKey: universityQueryKeys.all });

  const createMutation = useMutation({
    mutationFn: createUniversity,
    onSuccess: invalidateUniversities,
  });

  const updateMutation = useMutation({
    mutationFn: ({ universityId, name, active }: { universityId: number; name: string; active: boolean }) =>
      updateUniversity(universityId, { name, active }),
    onSuccess: invalidateUniversities,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUniversity,
    onSuccess: invalidateUniversities,
  });

  return { createMutation, deleteMutation, updateMutation };
}
