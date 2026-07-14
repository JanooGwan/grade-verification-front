export interface University {
  id: number;
  code: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUniversityRequest {
  code: string;
  name: string;
}

export interface UpdateUniversityRequest {
  name: string;
  active: boolean;
}
