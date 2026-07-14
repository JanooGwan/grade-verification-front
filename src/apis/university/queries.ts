import { queryOptions } from '@tanstack/react-query';

import { getUniversities } from '@/apis/university';

export const universityQueryKeys = {
  all: ['university'] as const,
  list: () => [...universityQueryKeys.all, 'list'] as const,
};

export const universityQueries = {
  list: () =>
    queryOptions({
      queryKey: universityQueryKeys.list(),
      queryFn: getUniversities,
    }),
};
