import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultInputState, parseInputState } from '../src/lib/query-state';

test('输入页默认状态不应预填生日与时辰', () => {
  assert.equal(defaultInputState.year, '');
  assert.equal(defaultInputState.month, '');
  assert.equal(defaultInputState.day, '');
  assert.equal(defaultInputState.timeIndex, '');
  assert.equal(defaultInputState.birthHour, '');
  assert.equal(defaultInputState.birthMinute, '');

  assert.equal(defaultInputState.partnerYear, '');
  assert.equal(defaultInputState.partnerMonth, '');
  assert.equal(defaultInputState.partnerDay, '');
  assert.equal(defaultInputState.partnerTimeIndex, '');
  assert.equal(defaultInputState.partnerBirthHour, '');
  assert.equal(defaultInputState.partnerBirthMinute, '');
});

test('空查询参数不应把空时辰解析成 0', () => {
  const inputState = parseInputState(new URLSearchParams('timeIndex=&partnerTimeIndex='));

  assert.equal(inputState.timeIndex, '');
  assert.equal(inputState.partnerTimeIndex, '');
});
