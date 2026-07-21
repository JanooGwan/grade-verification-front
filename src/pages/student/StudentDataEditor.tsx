import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTranscriptCourse, deleteStudent, deleteTranscriptCourse, updateStudent, updateStudentCommonData, updateTranscriptCourse } from '@/apis/transcript';
import type { StudentAttendance, StudentTranscript, TranscriptCourse, UpdateStudentCommonDataRequest, UpsertTranscriptCourseRequest } from '@/apis/transcript/entity';
import type { AchievementLevel, SubjectCategory } from '@/apis/evaluation/entity';
import { transcriptQueryKeys } from '@/apis/transcript/queries';
import { ApiError } from '@/apis/client';
import ConfirmDialog from '@/components/ConfirmDialog';

const subjects: SubjectCategory[] = ['KOREAN', 'MATH', 'ENGLISH', 'SOCIAL', 'SCIENCE', 'OTHER'];
const blankCourse = (): UpsertTranscriptCourseRequest => ({ schoolYear: 1, semester: 1, subjectCategory: 'KOREAN', courseName: '', grade: 1, achievement: null, rawScore: null, meanScore: null, standardDeviation: null, studentCount: null, credits: 3, careerSubject: false, professionalCourse: false });
const attendanceRows = (transcript: StudentTranscript): StudentAttendance[] => [1, 2, 3].map((schoolYear) => transcript.attendance.find((item) => item.schoolYear === schoolYear) ?? ({ schoolYear, unexcusedAbsenceDays: 0, unexcusedTardyCount: 0, unexcusedEarlyLeaveCount: 0, unexcusedClassAbsenceCount: 0 }));
const commonData = (transcript: StudentTranscript): UpdateStudentCommonDataRequest => ({
  educationBackground: transcript.educationBackground,
  highSchoolType: transcript.highSchoolType,
  graduationStatus: transcript.graduationStatus,
  gedAverageScore: transcript.gedAverageScore,
  attendance: attendanceRows(transcript),
  schoolViolenceActions: transcript.schoolViolenceActions.map((action) => ({
    schoolYear: action.schoolYear,
    actionNumber: action.actionNumber,
    actionDate: action.actionDate,
    active: action.active,
    note: action.note ?? '',
  })),
});
function message(error: unknown) { return error instanceof ApiError ? error.response?.message ?? error.message : error instanceof Error ? error.message : '저장하지 못했습니다.'; }

export default function StudentDataEditor({ transcript, onDeleted }: { transcript: StudentTranscript; onDeleted: () => void }) {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState({ name: transcript.name, highSchoolCode: transcript.highSchoolCode ?? '', highSchoolName: transcript.highSchoolName ?? '', graduationYear: transcript.graduationYear });
  const [common, setCommon] = useState<UpdateStudentCommonDataRequest>(() => commonData(transcript));
  const [courseId, setCourseId] = useState(0);
  const [course, setCourse] = useState<UpsertTranscriptCourseRequest>(blankCourse());
  const [pendingDelete, setPendingDelete] = useState<'student' | 'course' | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: transcriptQueryKeys.all });
  const profileMutation = useMutation({ mutationFn: () => updateStudent(transcript.studentId, profile), onSuccess: refresh });
  const commonMutation = useMutation({ mutationFn: () => updateStudentCommonData(transcript.studentId, common), onSuccess: refresh });
  const courseMutation = useMutation({ mutationFn: () => courseId ? updateTranscriptCourse(transcript.studentId, courseId, course) : createTranscriptCourse(transcript.studentId, course), onSuccess: async () => { setCourseId(0); setCourse(blankCourse()); await refresh(); } });
  const deleteCourseMutation = useMutation({ mutationFn: (id: number) => deleteTranscriptCourse(transcript.studentId, id), onSuccess: async () => { setPendingDelete(null); await refresh(); } });
  const deleteStudentMutation = useMutation({ mutationFn: () => deleteStudent(transcript.studentId), onSuccess: async () => { setPendingDelete(null); await refresh(); onDeleted(); } });
  const chooseCourse = (id: number) => {
    setCourseId(id);
    const selected = transcript.courses.find((item) => item.id === id);
    setCourse(selected ? toRequest(selected) : blankCourse());
  };
  const error = profileMutation.error ?? commonMutation.error ?? courseMutation.error ?? deleteCourseMutation.error ?? deleteStudentMutation.error;
  const updateAttendance = (index: number, field: keyof Omit<StudentAttendance, 'schoolYear'>, value: number) => setCommon({
    ...common,
    attendance: common.attendance.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
  });
  return <details className="student-data-editor">
    <summary><span><b>학생·과목 데이터 편집</b><small>기본정보와 개별 교과성적을 직접 보정합니다.</small></span><i>{transcript.dataQualityWarnings.length ? `경고 ${transcript.dataQualityWarnings.length}` : '데이터 정상'}</i></summary>
    {transcript.dataQualityWarnings.length > 0 && <div className="quality-warnings">{transcript.dataQualityWarnings.map((warning) => <p key={warning}>⚠ {warning}</p>)}</div>}
    {error && <div className="error-banner">{message(error)}</div>}
    <form className="student-profile-form" onSubmit={(event) => { event.preventDefault(); profileMutation.mutate(); }}>
      <strong>기본정보</strong>
      <label>이름<input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
      <label>고교코드<input value={profile.highSchoolCode} onChange={(event) => setProfile({ ...profile, highSchoolCode: event.target.value })} /></label>
      <label>고교명<input value={profile.highSchoolName} onChange={(event) => setProfile({ ...profile, highSchoolName: event.target.value })} /></label>
      <label>졸업연도<input type="number" value={profile.graduationYear ?? ''} onChange={(event) => setProfile({ ...profile, graduationYear: event.target.value ? Number(event.target.value) : null })} /></label>
      <button>기본정보 저장</button><button className="danger-action" type="button" onClick={() => setPendingDelete('student')}>학생 삭제</button>
    </form>
    <form className="student-common-data-form" onSubmit={(event) => { event.preventDefault(); commonMutation.mutate(); }}>
      <div className="course-editor-heading"><strong>대학 공통 평가 데이터</strong><small>모든 대학 전형 계산에서 공통으로 사용됩니다.</small></div>
      <div className="student-common-profile">
        <label>학력 유형<select value={common.educationBackground} onChange={(event) => setCommon({ ...common, educationBackground: event.target.value as UpdateStudentCommonDataRequest['educationBackground'], highSchoolType: event.target.value === 'DOMESTIC_HIGH_SCHOOL' ? common.highSchoolType : 'GENERAL', gedAverageScore: event.target.value === 'GED' ? common.gedAverageScore : null })}><option value="DOMESTIC_HIGH_SCHOOL">국내 고등학교</option><option value="GED">검정고시</option><option value="FOREIGN_HIGH_SCHOOL">외국 고등학교</option></select></label>
        {common.educationBackground === 'DOMESTIC_HIGH_SCHOOL' && <label>고교 유형<select value={common.highSchoolType} onChange={(event) => setCommon({ ...common, highSchoolType: event.target.value as UpdateStudentCommonDataRequest['highSchoolType'] })}><option value="GENERAL">일반고</option><option value="SPECIALIZED">특성화고</option><option value="COMPREHENSIVE_VOCATIONAL">종합고 전문계열</option><option value="LIFELONG_EDUCATION_FACILITY">학력인정 평생교육시설</option></select></label>}
        <label>졸업 상태<select value={common.graduationStatus} onChange={(event) => setCommon({ ...common, graduationStatus: event.target.value as UpdateStudentCommonDataRequest['graduationStatus'] })}><option value="EXPECTED_GRADUATE">고교 졸업예정자</option><option value="GRADUATE">고교 졸업자</option></select></label>
        {common.educationBackground === 'GED' && <label>검정고시 전 과목 평균<input required type="number" min="0" max="100" step="0.01" value={common.gedAverageScore ?? ''} onChange={(event) => setCommon({ ...common, gedAverageScore: event.target.value ? Number(event.target.value) : null })} /></label>}
      </div>
      <div className="student-common-section">
        <strong>학년별 미인정 출결</strong>
        <div className="student-attendance-grid student-attendance-grid--head"><span>학년</span><span>결석</span><span>지각</span><span>조퇴</span><span>결과</span></div>
        {common.attendance.map((item, index) => <div className="student-attendance-grid" key={item.schoolYear}>
          <b>{item.schoolYear}학년</b>
          <input aria-label={`${item.schoolYear}학년 미인정 결석`} type="number" min="0" value={item.unexcusedAbsenceDays} onChange={(event) => updateAttendance(index, 'unexcusedAbsenceDays', Number(event.target.value))} />
          <input aria-label={`${item.schoolYear}학년 미인정 지각`} type="number" min="0" value={item.unexcusedTardyCount} onChange={(event) => updateAttendance(index, 'unexcusedTardyCount', Number(event.target.value))} />
          <input aria-label={`${item.schoolYear}학년 미인정 조퇴`} type="number" min="0" value={item.unexcusedEarlyLeaveCount} onChange={(event) => updateAttendance(index, 'unexcusedEarlyLeaveCount', Number(event.target.value))} />
          <input aria-label={`${item.schoolYear}학년 미인정 결과`} type="number" min="0" value={item.unexcusedClassAbsenceCount} onChange={(event) => updateAttendance(index, 'unexcusedClassAbsenceCount', Number(event.target.value))} />
        </div>)}
      </div>
      <div className="student-common-section">
        <div className="course-editor-heading"><strong>학교폭력 조치사항</strong><button type="button" onClick={() => setCommon({ ...common, schoolViolenceActions: [...common.schoolViolenceActions, { schoolYear: 1, actionNumber: 1, actionDate: null, active: true, note: '' }] })}>조치 추가</button></div>
        {common.schoolViolenceActions.length === 0 && <p className="application-notice">등록된 학교폭력 조치가 없습니다.</p>}
        {common.schoolViolenceActions.map((action, index) => <div className="student-violence-row" key={index}>
          <label>학년<select value={action.schoolYear ?? ''} onChange={(event) => setCommon({ ...common, schoolViolenceActions: common.schoolViolenceActions.map((item, itemIndex) => itemIndex === index ? { ...item, schoolYear: event.target.value ? Number(event.target.value) : null } : item) })}><option value="">미상</option><option value="1">1학년</option><option value="2">2학년</option><option value="3">3학년</option></select></label>
          <label>조치<select value={action.actionNumber} onChange={(event) => setCommon({ ...common, schoolViolenceActions: common.schoolViolenceActions.map((item, itemIndex) => itemIndex === index ? { ...item, actionNumber: Number(event.target.value) } : item) })}>{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => <option value={number} key={number}>{number}호</option>)}</select></label>
          <label>조치일<input type="date" value={action.actionDate ?? ''} onChange={(event) => setCommon({ ...common, schoolViolenceActions: common.schoolViolenceActions.map((item, itemIndex) => itemIndex === index ? { ...item, actionDate: event.target.value || null } : item) })} /></label>
          <label className="inline-check"><input type="checkbox" checked={action.active} onChange={(event) => setCommon({ ...common, schoolViolenceActions: common.schoolViolenceActions.map((item, itemIndex) => itemIndex === index ? { ...item, active: event.target.checked } : item) })} />현재 반영</label>
          <label>비고<input maxLength={500} value={action.note} onChange={(event) => setCommon({ ...common, schoolViolenceActions: common.schoolViolenceActions.map((item, itemIndex) => itemIndex === index ? { ...item, note: event.target.value } : item) })} /></label>
          <button className="danger-action" type="button" onClick={() => setCommon({ ...common, schoolViolenceActions: common.schoolViolenceActions.filter((_, itemIndex) => itemIndex !== index) })}>삭제</button>
        </div>)}
      </div>
      <button disabled={commonMutation.isPending}>{commonMutation.isPending ? '공통 데이터 저장 중…' : '공통 데이터 저장'}</button>
    </form>
    <form className="course-editor-form" onSubmit={(event: FormEvent) => { event.preventDefault(); courseMutation.mutate(); }}>
      <div className="course-editor-heading"><strong>과목 성적</strong><select value={courseId} onChange={(event) => chooseCourse(Number(event.target.value))}><option value={0}>새 과목 추가</option>{transcript.courses.map((item) => <option value={item.id} key={item.id}>{item.schoolYear}-{item.semester} {item.courseName}</option>)}</select></div>
      <label>학년<input type="number" min="1" max="3" value={course.schoolYear} onChange={(e) => setCourse({ ...course, schoolYear: Number(e.target.value) })} /></label>
      <label>학기<input type="number" min="1" max="2" value={course.semester} onChange={(e) => setCourse({ ...course, semester: Number(e.target.value) })} /></label>
      <label>교과<select value={course.subjectCategory} onChange={(e) => setCourse({ ...course, subjectCategory: e.target.value as SubjectCategory })}>{subjects.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>과목명<input required value={course.courseName} onChange={(e) => setCourse({ ...course, courseName: e.target.value })} /></label>
      <label>등급<input type="number" min="1" max="9" value={course.grade ?? ''} onChange={(e) => setCourse({ ...course, grade: e.target.value ? Number(e.target.value) : null })} /></label>
      <label>성취도<select value={course.achievement ?? ''} onChange={(e) => setCourse({ ...course, achievement: (e.target.value || null) as AchievementLevel | null })}><option value="">없음</option>{['A', 'B', 'C', 'D', 'E'].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>이수단위<input type="number" min="0.01" step="0.01" value={course.credits} onChange={(e) => setCourse({ ...course, credits: Number(e.target.value) })} /></label>
      <label className="inline-check"><input type="checkbox" checked={course.careerSubject} onChange={(e) => setCourse({ ...course, careerSubject: e.target.checked })} />진로선택</label>
      <label className="inline-check"><input type="checkbox" checked={course.professionalCourse} onChange={(e) => setCourse({ ...course, professionalCourse: e.target.checked })} />전문교과</label>
      <button>{courseId ? '과목 수정' : '과목 추가'}</button>{courseId > 0 && <button className="danger-action" type="button" onClick={() => setPendingDelete('course')}>과목 삭제</button>}
    </form>
    <ConfirmDialog
      open={pendingDelete !== null}
      title={pendingDelete === 'student' ? '학생 데이터를 삭제할까요?' : '과목 성적을 삭제할까요?'}
      description={pendingDelete === 'student' ? '학생과 연결된 모든 성적·지원·검증 이력이 함께 삭제됩니다.' : '선택한 과목 성적은 삭제 후 복구할 수 없습니다.'}
      confirmLabel={pendingDelete === 'student' ? '학생 삭제' : '과목 삭제'}
      pending={deleteStudentMutation.isPending || deleteCourseMutation.isPending}
      danger
      onCancel={() => setPendingDelete(null)}
      onConfirm={() => {
        if (pendingDelete === 'student') deleteStudentMutation.mutate();
        if (pendingDelete === 'course' && courseId > 0) deleteCourseMutation.mutate(courseId);
      }}
    />
  </details>;
}

function toRequest(course: TranscriptCourse): UpsertTranscriptCourseRequest {
  const { id, ...request } = course;
  void id;
  return request;
}
