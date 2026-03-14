import { describe, it } from 'vitest';

describe('renderSpec', () => {
  it.todo('contains all 7 required sections');
  it.todo('acceptance criteria use GIVEN/WHEN/THEN format');
  it.todo('affected files rendered as JSON code block');
  it.todo('omits Code Conventions when null');
  it.todo('includes complexity as single letter');
});

describe('generateSlug', () => {
  it.todo('converts title to lowercase hyphenated slug');
  it.todo('truncates to 50 characters');
  it.todo('strips leading/trailing hyphens');
});

describe('deriveComplexity', () => {
  it.todo('returns S for effort <= 3');
  it.todo('returns M for effort 4-6');
  it.todo('returns L for effort > 6');
});

describe('specFileManager', () => {
  it.todo('formatFilename pads sequence to 3 digits');
  it.todo('formatFilename handles double digits');
});

describe('specRepository', () => {
  it.todo('createSpec persists and returns metadata');
  it.todo('getSpecsByRunId returns specs ordered by sequence_number');
  it.todo('updateSpecStatus changes status');
  it.todo('deleteSpecsByRunId removes all specs for a run');
});

describe('Brain integration', () => {
  it.todo('includes conventions when Brain has data');
  it.todo('omits Code Conventions when Brain has no data');
});
