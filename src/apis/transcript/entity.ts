import type { AchievementLevel, CourseGrade, SubjectCategory } from '@/apis/evaluation/entity';

export type EducationBackground = 'DOMESTIC_HIGH_SCHOOL' | 'GED' | 'FOREIGN_HIGH_SCHOOL';
export type GraduationStatus = 'EXPECTED_GRADUATE' | 'GRADUATE';
export type HighSchoolType = 'GENERAL' | 'SPECIALIZED' | 'COMPREHENSIVE_VOCATIONAL' | 'LIFELONG_EDUCATION_FACILITY' | 'TWO_YEAR';
export type GradeScale = 'NINE_LEVEL' | 'FIVE_LEVEL' | 'LEGACY';
export type LegacyAchievement = 'SU' | 'WOO' | 'MI' | 'YANG' | 'GA';
export type GedSubjectType = 'KOREAN' | 'ENGLISH' | 'MATH' | 'KOREAN_HISTORY' | 'SOCIAL' | 'SCIENCE' | 'ELECTIVE';
export type LegacySummaryType = 'SEMESTER' | 'YEAR';

export interface GedSubjectScore {
  id?: number;
  subjectType: GedSubjectType;
  subjectName: string;
  score: number;
}

export interface LegacyGradeSummary {
  id?: number;
  summaryType: LegacySummaryType;
  schoolYear: number;
  semester: number | null;
  rankPosition: number;
  tiedRankCount: number | null;
  cohortSize: number;
  credits: number;
}

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
  gradeScale: GradeScale;
  achievement: AchievementLevel | null;
  rawScore: number | null;
  meanScore: number | null;
  standardDeviation: number | null;
  studentCount: number | null;
  rankPosition: number | null;
  tiedRankCount: number | null;
  legacyAchievement: LegacyAchievement | null;
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
  gedSubjectScores: GedSubjectScore[];
  legacyGradeSummaries: LegacyGradeSummary[];
  attendance: StudentAttendance[];
  schoolViolenceActions: StudentSchoolViolenceAction[];
  courses: TranscriptCourse[];
  dataQualityWarnings: string[];
}

export type TranscriptImportMode = 'VALID_ROWS_ONLY' | 'ALL_OR_NOTHING';

export interface TranscriptPreview {
  originalFileName: string;
  fileSha256: string;
  sourceFormat: 'STANDARD_TRANSCRIPT_V1' | 'HANSHIN_MULTI_SHEET_V1';
  applicationRows: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  skippedRows: number;
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
  verification: {
    totalApplications: number;
    successfulApplications: number;
    failedApplications: number;
    sampleResults: Array<{
      applicationRowNumber: number;
      applicantNumber: string;
      studentName: string;
      admissionTrackName: string;
      recruitmentUnitName: string;
      finalScore: number;
      averageGrade: number;
      includedCourseCount: number;
    }>;
  } | null;
  errors: Array<{ rowNumber: number; reason: string }>;
  warnings: string[];
}

export interface TranscriptImportResult {
  importId: number;
  status: 'COMPLETED' | 'COMPLETED_WITH_ERRORS';
  sourceFormat: 'STANDARD_TRANSCRIPT_V1' | 'HANSHIN_MULTI_SHEET_V1';
  totalRows: number;
  importedRows: number;
  failedRows: number;
  skippedRows: number;
  createdStudents: number;
  updatedStudents: number;
  createdCourses: number;
  updatedCourses: number;
  deletedCourses: number;
  applicationRows: number;
  createdApplications: number;
  deletedApplications: number;
  createdAdmissionTracks: number;
  createdRecruitmentUnits: number;
  errors: Array<{ rowNumber: number; reason: string }>;
  warnings: string[];
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
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED';
  sourceFormat: 'STANDARD_TRANSCRIPT_V1' | 'HANSHIN_MULTI_SHEET_V1' | 'SYU_SOURCE_WORKBOOK_V1';
  errorMessage: string | null;
  createdAt: string;
}

export interface SourceImportStartResult {
  importId: number;
  status: 'QUEUED';
  sourceFormat: 'SYU_SOURCE_WORKBOOK_V1';
  message: string;
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
  gedSubjectScores: Array<Omit<GedSubjectScore, 'id'>>;
  legacyGradeSummaries: Array<Omit<LegacyGradeSummary, 'id'>>;
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
  gradeScale: course.gradeScale,
  achievement: course.achievement,
  rawScore: course.rawScore,
  meanScore: course.meanScore,
  standardDeviation: course.standardDeviation,
  studentCount: course.studentCount,
  rankPosition: course.rankPosition,
  tiedRankCount: course.tiedRankCount,
  legacyAchievement: course.legacyAchievement,
  careerSubject: course.careerSubject,
  professionalCourse: course.professionalCourse,
  credits: course.credits,
});
