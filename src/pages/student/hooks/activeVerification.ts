import type { StoredVerificationJob } from '@/apis/transcript/entity';

export function findActiveVerification(jobs: StoredVerificationJob[], universityId: number, admissionYear: number) {
  return jobs.find((job) => job.status === 'PROCESSING'
    && job.universityId === universityId && job.admissionYear === admissionYear);
}
