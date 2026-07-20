import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTranscriptCourse, deleteStudent, deleteTranscriptCourse, updateStudent, updateTranscriptCourse } from '@/apis/transcript';
import type { StudentTranscript, TranscriptCourse, UpsertTranscriptCourseRequest } from '@/apis/transcript/entity';
import type { AchievementLevel, SubjectCategory } from '@/apis/evaluation/entity';
import { transcriptQueryKeys } from '@/apis/transcript/queries';
import { ApiError } from '@/apis/client';
import ConfirmDialog from '@/components/ConfirmDialog';

const subjects: SubjectCategory[] = ['KOREAN', 'MATH', 'ENGLISH', 'SOCIAL', 'SCIENCE', 'OTHER'];
const blankCourse = (): UpsertTranscriptCourseRequest => ({ schoolYear: 1, semester: 1, subjectCategory: 'KOREAN', courseName: '', grade: 1, achievement: null, rawScore: null, meanScore: null, standardDeviation: null, studentCount: null, credits: 3, careerSubject: false, professionalCourse: false });
function message(error: unknown) { return error instanceof ApiError ? error.response?.message ?? error.message : error instanceof Error ? error.message : '저장하지 못했습니다.'; }

export default function StudentDataEditor({ transcript, onDeleted }: { transcript: StudentTranscript; onDeleted: () => void }) {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState({ name: transcript.name, highSchoolCode: transcript.highSchoolCode ?? '', highSchoolName: transcript.highSchoolName ?? '', graduationYear: transcript.graduationYear });
  const [courseId, setCourseId] = useState(0);
  const [course, setCourse] = useState<UpsertTranscriptCourseRequest>(blankCourse());
  const [pendingDelete, setPendingDelete] = useState<'student' | 'course' | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: transcriptQueryKeys.all });
  const profileMutation = useMutation({ mutationFn: () => updateStudent(transcript.studentId, profile), onSuccess: refresh });
  const courseMutation = useMutation({ mutationFn: () => courseId ? updateTranscriptCourse(transcript.studentId, courseId, course) : createTranscriptCourse(transcript.studentId, course), onSuccess: async () => { setCourseId(0); setCourse(blankCourse()); await refresh(); } });
  const deleteCourseMutation = useMutation({ mutationFn: (id: number) => deleteTranscriptCourse(transcript.studentId, id), onSuccess: async () => { setPendingDelete(null); await refresh(); } });
  const deleteStudentMutation = useMutation({ mutationFn: () => deleteStudent(transcript.studentId), onSuccess: async () => { setPendingDelete(null); await refresh(); onDeleted(); } });
  const chooseCourse = (id: number) => {
    setCourseId(id);
    const selected = transcript.courses.find((item) => item.id === id);
    setCourse(selected ? toRequest(selected) : blankCourse());
  };
  const error = profileMutation.error ?? courseMutation.error ?? deleteCourseMutation.error ?? deleteStudentMutation.error;
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
