import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import ReviewFilterNotice from './ReviewFilterNotice';

it('distinguishes an unsupported filter from a filtered view and its full export', () => {
  expect(renderToStaticMarkup(<ReviewFilterNotice enabled applied={false} />)).toContain('전체 결과가 표시됩니다');
  expect(renderToStaticMarkup(<ReviewFilterNotice enabled applied />)).toContain('전체 결과를 포함합니다');
  expect(renderToStaticMarkup(<ReviewFilterNotice enabled={false} applied />)).toBe('');
  expect(renderToStaticMarkup(<ReviewFilterNotice enabled applied={undefined} />)).toBe('');
});
