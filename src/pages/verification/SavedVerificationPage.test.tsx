import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';

const state=vi.hoisted(() => ({ hook:0, reviewOnly:false, applied:true }));
vi.mock('react',async (importOriginal) => {
  const actual=await importOriginal<typeof import('react')>();
  return {...actual,useState:(initial:unknown) => {
    const index=state.hook++;
    return [index===6 ? state.reviewOnly : typeof initial==='function' ? initial() : initial,vi.fn()];
  }};
});
vi.mock('@tanstack/react-query',async (importOriginal) => ({
  ...await importOriginal<typeof import('@tanstack/react-query')>(),
  useQuery:({queryKey}:{queryKey:unknown[]}) => {
    const kind=queryKey[1];
    const batch={sourceImportId:1,universityId:1,universityName:'합성대학',admissionYear:2027,
      originalFileName:'synthetic.xlsx',sourceFormat:'STANDARD_TRANSCRIPT_V1',resultCount:1,savedAt:'2026-01-01T00:00:00Z'};
    const data=kind==='batches' ? [batch] : kind==='results' ? {
      content:[{verificationRunId:1,applicantNumber:'SYNTH',studentName:'합성',admissionTrackName:'일반',ruleName:'규칙',ruleVersion:1,
        recruitmentUnitName:'학과',includedCourseCount:1,excludedCourseCount:0,averageGrade:2,finalScore:90,requiresReview:true}],
      totalElements:1,totalPages:1,first:true,last:true,...(state.applied ? {reviewFilterApplied:true} : {}),
    } : [];
    return {data,isLoading:false,isFetching:false,error:null};
  },
  useMutation:() => ({isPending:false,error:null,mutate:vi.fn(),reset:vi.fn()}),
}));
import SavedVerificationPage from './SavedVerificationPage';

beforeEach(() => {
  state.hook=0;state.reviewOnly=true;state.applied=true;
  vi.stubGlobal('window',{localStorage:{getItem:() => '1',setItem:vi.fn()}});
});
afterEach(() => vi.unstubAllGlobals());

it('marks review cases and explains that Excel contains all results',() => {
  const html=renderToStaticMarkup(<SavedVerificationPage />);
  expect(html).toContain('동점 검토가 필요한 결과만 보기');
  expect(html).toContain('동점 검토 필요');
  expect(html).toContain('전체 결과를 포함합니다');
});

it('warns if an older server ignores the filter',() => {
  state.applied=false;
  const html=renderToStaticMarkup(<SavedVerificationPage />);
  expect(html).toContain('전체 결과가 표시됩니다');
});
