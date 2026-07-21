import type { AchievementLevel, CourseGrade, SubjectCategory } from '@/apis/evaluation/entity';

export type EducationBackground = 'DOMESTIC_HIGH_SCHOOL' | 'GED' | 'FOREIGN_HIGH_SCHOOL';
export type GraduationStatus = 'EXPECTED_GRADUATE' | 'GRADUATE';
export type HighSchoolType = 'GENERAL' | 'SPECIALIZED' | 'COMPREHENSIVE_VOCATIONAL' | 'LIFELONG_EDUCATION_FACILITY';

export interface StudentAttendance {
  schoolYear: number;
  unexcusedAbsenceDays: number;
  unexcusedTardyCount: number;
  unexcusedEarlyLeaveCount: number;
  unexcusedClassAbsenceCount: number;
}

export interface StudentSchoolViolenceAction {
  id?: number;
  schoolYear: number | null;
  actionNumber: number;
  actionDate: string | null;
  active: boolean;
  note: string | null;
}

export interface StudentSummary {
  studentId: number;
  admissionYear: number;
  applicantNumber: string;
  name: string;
  highSchoolCode: string | null;
  highSchoolName: string | null;
  graduationYear: number | null;
  educationBackground: EducationBackground;
  highSchoolType: HighSchoolType;
  graduationStatus: GraduationStatus;
  courseCount: number;
  averageGrade: number | null;
}

export interface StudentPage {
  content: StudentSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface TranscriptCourse {
  id: number;
  schoolYear: number;
  semester: number;
  subjectCategory: SubjectCategory;
  courseName: string;
  grade: number | null;
  achievement: AchievementLevel | null;
  rawScore: number | null;
  meanScore: number | null;
  standardDeviation: number | null;
  studentCount: number | null;
  credits: number;
  careerSubject: boolean;
  professionalCourse: boolean;
}

export interface StudentTranscript {
  studentId: number;
  admissionYear: number;
  applicantNumber: string;
  name: string;
  highSchoolCode: string | null;
  highSchoolName: string | null;
  graduationYear: number | null;
  educationBackground: EducationBackground;
  highSchoolType: HighSchoolType;
  graduationStatus: GraduationStatus;
  gedAverageScore: number | null;
  attendance: StudentAttendance[];
  schoolViolenceActions: StudentSchoolViolenceAction[];
  courses: TranscriptCourse[];
  dataQualityWarnings: string[];
}

export type TranscriptImportMode = 'VALID_ROWS_ONLY' | 'ALL_OR_NOTHING';

export interface TranscriptPreview {
  originalFileName: string;
  fileSha256: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  sampleRows: Array<{
    rowNumber: number;
    applicantNumber: string;
    studentName: string;
    schoolYear: number;
    semester: number;
    subjectCategory: SubjectCategory;
    courseName: string;
    grade: number | null;
    achievement: AchievementLevel | null;
    credits: number;
  }>;
  errors: Array<{ rowNumber: number; message: string }>;
}

export interface TranscriptImportResult {
  importId: number;
  status: 'COMPLETED' | 'COMPLETED_WITH_ERRORS';
  totalRows: number;
  importedRows: number;
  failedRows: number;
  createdStudents: number;
  updatedStudents: number;
  createdCourses: number;
  updatedCourses: number;
  errors: Array<{ rowNumber: number; message: string }>;
}

export interface TranscriptImportHistory {
  importId: number;
  admissionYear: number;
  originalFileName: string;
  importMode: TranscriptImportMode;
  fileSha256: string | null;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  status: 'COMPLETED' | 'COMPLETED_WITH_ERRORS';
  createdAt: string;
}

export interface UpdateStudentRequest {
  name: string;
  highSchoolCode: string;
  highSchoolName: string;
  graduationYear: number | null;
}

export interface UpdateStudentCommonDataRequest {
  educationBackground: EducationBackground;
  highSchoolType: HighSchoolType;
  graduationStatus: GraduationStatus;
  gedAverageScore: number | null;
  attendance: StudentAttendance[];
  schoolViolenceActions: Array<Omit<StudentSchoolViolenceAction, 'id' | 'note'> & { note: string }>;
}

export type UpsertTranscriptCourseRequest = Omit<TranscriptCourse, 'id'>;

export const toCourseGrade = (course: TranscriptCourse): CourseGrade => ({
  schoolYear: course.schoolYear,
  semester: course.semester,
  subjectCategory: course.subjectCategory,
  courseName: course.courseName,
  grade: course.grade,
  achievement: course.achievement,
  rawScore: course.rawScore,
  meanScore: course.meanScore,
  standardDeviation: course.standardDeviation,
  studentCount: course.studentCount,
  careerSubject: course.careerSubject,
  professionalCourse: course.professionalCourse,
  credits: course.credits,
});
