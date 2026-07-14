import { apiClient } from '@/apis/client';
import type { CreateUniversityRequest, University, UpdateUniversityRequest } from '@/apis/university/entity';

const UNIVERSITY_ENDPOINT = 'universities';

export const getUniversities = () => apiClient.get<University[]>(UNIVERSITY_ENDPOINT);

export const createUniversity = (request: CreateUniversityRequest) =>
  apiClient.post<University>(UNIVERSITY_ENDPOINT, request);

export const updateUniversity = (universityId: number, request: UpdateUniversityRequest) =>
  apiClient.put<University>(`${UNIVERSITY_ENDPOINT}/${universityId}`, request);

export const deleteUniversity = (universityId: number) => apiClient.delete(`${UNIVERSITY_ENDPOINT}/${universityId}`);
