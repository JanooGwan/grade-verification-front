import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { runStoredTranscriptVerification } from '@/apis/transcript';
import type { StoredVerificationJob } from '@/apis/transcript/entity';
import { transcriptQueryKeys } from '@/apis/transcript/queries';

export function useStoredVerification(universityId: number, admissionYear: number) {
  const queryClient = useQueryClient();
  const [job, setJob] = useState<StoredVerificationJob | null>(null);
  const verification = useMutation({
    mutationFn: () => runStoredTranscriptVerification(universityId, admissionYear, setJob),
    onMutate: () => setJob(null),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: transcriptQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['operations', 'dashboard'] }),
      ]);
    },
  });
  return {
    verification,
    job: job?.universityId === universityId && job.admissionYear === admissionYear ? job : null,
  };
}
