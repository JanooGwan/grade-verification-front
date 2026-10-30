import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { runStoredTranscriptVerification } from '@/apis/transcript';
import type { StoredVerificationJob } from '@/apis/transcript/entity';
import { transcriptQueryKeys } from '@/apis/transcript/queries';
import { getActiveJobs } from '@/apis/operation';
import { findActiveVerification } from './activeVerification';

export function useStoredVerification(universityId: number, admissionYear: number) {
  const queryClient = useQueryClient();
  const [job, setJob] = useState<StoredVerificationJob | null>(null);
  const activeJobs = useQuery({
    queryKey: ['operations', 'active-jobs'], queryFn: getActiveJobs,
    enabled: universityId > 0, refetchInterval: 3000,
  });
  const serverJob = findActiveVerification(activeJobs.data?.verifications ?? [], universityId, admissionYear);
  const verification = useMutation({
    mutationFn: () => runStoredTranscriptVerification(universityId, admissionYear, (progress) => {
      setJob(progress);
      void queryClient.invalidateQueries({ queryKey: ['operations', 'active-jobs'] });
    }),
    onMutate: () => setJob(null),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: transcriptQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['operations', 'dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['operations', 'data-status'] }),
        queryClient.invalidateQueries({ queryKey: ['operations', 'active-jobs'] }),
      ]);
    },
  });
  return {
    verification,
    isRunning: Boolean(serverJob) || verification.isPending,
    statusUnavailable: universityId > 0 && (!activeJobs.isFetchedAfterMount || activeJobs.isError),
    statusError: universityId > 0 && activeJobs.isError,
    job: serverJob ?? (job?.universityId === universityId && job.admissionYear === admissionYear ? job : null),
  };
}
