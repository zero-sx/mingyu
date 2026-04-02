import { baziCalculator } from '@/utils/bazi/baziCalculator';
import type { BaziChartResult } from '@/utils/bazi/baziTypes';
import type { Person } from '@/composables/useFormState';
import type { ChartInput } from '@/types/chart';
import type { AnalysisPayloadV1, ScopeType } from '@/types/analysis';
import type { AiReportContext } from '@/types/ai';
import {
  buildAstrolabeFromInput,
  buildHoroscope,
  getDefaultHoroscopeContext,
} from '@/lib/iztro/runtime-helpers';
import { buildAnalysisPayloadV1 } from '@/lib/iztro/build-analysis-payload';
import { buildPortablePromptPack } from '@/lib/ziwei-prompts';
import {
  ZIWEI_ANALYSIS_REQUIREMENT,
  ZIWEI_ANALYST_ROLE,
  ZIWEI_COMPATIBILITY_ROLE,
} from '@/lib/ziwei-prompt-copy';

export type ZiweiRuntime = {
  astrolabe: any;
  horoscope: any;
  payloadByScope: Record<ScopeType, AnalysisPayloadV1>;
};

export function buildPersonFromInput(input: {
  gender: 'male' | 'female';
  year: string;
  month: string;
  day: string;
  timeIndex: number | '';
  dateType: 'solar' | 'lunar';
  isLeapMonth: boolean;
  useTrueSolarTime: boolean;
  birthHour: string;
  birthMinute: string;
  birthPlace: string;
  birthLongitude: string;
}): Person {
  if (!input.useTrueSolarTime && input.timeIndex === '') {
    throw new Error('请选择出生时辰。');
  }

  return {
    name: '',
    gender: input.gender,
    year: Number(input.year),
    month: Number(input.month),
    day: Number(input.day),
    timeIndex: Number(input.timeIndex),
    isLunar: input.dateType === 'lunar',
    isLeapMonth: input.isLeapMonth,
    useTrueSolarTime: input.useTrueSolarTime,
    birthHour: input.useTrueSolarTime ? Number(input.birthHour) : undefined,
    birthMinute: input.useTrueSolarTime ? Number(input.birthMinute) : undefined,
    birthPlace: input.useTrueSolarTime ? input.birthPlace : '',
    birthLongitude: input.useTrueSolarTime ? Number(input.birthLongitude) : undefined,
  };
}

export function calculateFullBaziChart(person: Person): BaziChartResult {
  return baziCalculator.calculateBazi({
    year: Number(person.year),
    month: Number(person.month),
    day: Number(person.day),
    timeIndex: person.timeIndex,
    gender: person.gender,
    isLunar: person.isLunar,
    isLeapMonth: person.isLeapMonth,
    useTrueSolarTime: person.useTrueSolarTime,
    birthHour: person.birthHour,
    birthMinute: person.birthMinute,
    birthPlace: person.birthPlace,
    birthLongitude: person.birthLongitude,
  });
}

export async function calculateFullZiweiChart(input: ChartInput): Promise<ZiweiRuntime> {
  const astrolabe = await buildAstrolabeFromInput(input);
  const { dateStr, hourIndex } = getDefaultHoroscopeContext();
  const horoscope = buildHoroscope(astrolabe, dateStr, hourIndex);

  const scopes: ScopeType[] = ['origin', 'decadal', 'yearly', 'monthly', 'daily', 'hourly'];
  const payloadByScope = Object.fromEntries(
    scopes.map((scope) => [
      scope,
      buildAnalysisPayloadV1({
        astrolabe,
        horoscope,
        currentScope: scope,
      }),
    ]),
  ) as Record<ScopeType, AnalysisPayloadV1>;

  return {
    astrolabe,
    horoscope,
    payloadByScope,
  };
}

export function buildZiweiChartInput(input: {
  name: string;
  gender: 'male' | 'female';
  dateType: 'solar' | 'lunar';
  year: string;
  month: string;
  day: string;
  timeIndex: number | '';
  isLeapMonth: boolean;
}): ChartInput {
  if (input.timeIndex === '') {
    throw new Error('请选择出生时辰。');
  }

  const gender = input.gender === 'male' ? '男' : '女';
  const birthDate = `${input.year}-${input.month.padStart(2, '0')}-${input.day.padStart(2, '0')}`;

  return {
    name: input.name,
    gender,
    dateType: input.dateType,
    birthDate,
    birthTimeIndex: input.timeIndex,
    isLeapMonth: input.isLeapMonth,
    fixLeap: true,
    astroType: 'earth',
    algorithm: 'default',
    yearDivide: 'normal',
    horoscopeDivide: 'normal',
    ageDivide: 'normal',
    dayDivide: 'current',
  };
}

export function createZiweiReportContext(
  payload: AnalysisPayloadV1,
  topic: string,
): AiReportContext {
  const topicMap: Record<
    string,
    { report_type: string; report_title: string; selected_topic: string }
  > = {
    destiny: {
      report_type: payload.active_scope.scope === 'origin' ? 'destiny-overview' : 'scope',
      report_title: payload.active_scope.scope === 'origin' ? '命局综述' : `${payload.active_scope.label}报告`,
      selected_topic: 'destiny',
    },
    relationship: {
      report_type: 'relationship',
      report_title: '婚姻感情报告',
      selected_topic: 'relationship',
    },
    'career-wealth': {
      report_type: 'career-wealth',
      report_title: '事业财运报告',
      selected_topic: 'career-wealth',
    },
    life: {
      report_type: 'life',
      report_title: '人生解析报告',
      selected_topic: 'life',
    },
    chat: {
      report_type: 'chat',
      report_title: '自由问答',
      selected_topic: 'chat',
    },
  };

  const matched = topicMap[topic] ?? topicMap.chat;

  return {
    report_key: `${matched.selected_topic}:${payload.active_scope.scope}:${payload.active_scope.solar_date}`,
    report_title: matched.report_title,
    report_type: matched.report_type,
    selected_topic: matched.selected_topic,
    scope_type: payload.active_scope.scope,
    scope_label: payload.active_scope.label,
    focus_notes: [
      `当前时限：${payload.active_scope.label}`,
      `参考日期：${payload.active_scope.solar_date}`,
      `命主：${payload.basic_info.soul}`,
      `身主：${payload.basic_info.body}`,
    ],
    suggested_questions: [],
  };
}

export function buildCombinedZiweiPrompt(
  payload: AnalysisPayloadV1,
  topic: string,
  question: string,
) {
  const reportContext = createZiweiReportContext(payload, topic);
  const pack = buildPortablePromptPack({
    payload,
    reportContext,
  });

  return [
    ZIWEI_ANALYST_ROLE,
    '【要求】',
    `- ${ZIWEI_ANALYSIS_REQUIREMENT}`,
    '- 先给结论，再展开最关键的 2 到 4 个重点。',
    '- 每个重点都要写明盘面依据与建议。',
    '',
    `【当前时间】\n${new Date().toLocaleString('zh-CN')}`,
    pack,
    `【问题】\n${question.trim() || '请先做整体解读。'}`,
    '【任务】\n结合盘面结构与当前运限，给出核心判断、关键依据和建议。',
    '【输出要求】\n先给结论，再展开最关键的 2 到 4 个重点；每个重点都要写明盘面依据与建议。',
  ].join('\n');
}

export function buildCombinedZiweiCompatibilityPrompt(params: {
  primaryPayload: AnalysisPayloadV1;
  partnerPayload: AnalysisPayloadV1;
  topic: string;
  question: string;
}) {
  const primaryContext = createZiweiReportContext(params.primaryPayload, params.topic);
  const partnerContext = createZiweiReportContext(params.partnerPayload, params.topic);
  const primaryPack = buildPortablePromptPack({
    payload: params.primaryPayload,
    reportContext: primaryContext,
  });
  const partnerPack = buildPortablePromptPack({
    payload: params.partnerPayload,
    reportContext: partnerContext,
  });

  return [
    ZIWEI_COMPATIBILITY_ROLE,
    '【要求】',
    '- 只基于提供的双方盘面和问题作答。',
    '- 先判断关系主基调，再展开 2 到 4 个关键点。',
    '- 重点说明关系模式、互补点、冲突点、推进节奏与建议。',
    '',
    `【当前时间】\n${new Date().toLocaleString('zh-CN')}`,
    '【第一人盘面】',
    primaryPack,
    '',
    '【第二人盘面】',
    partnerPack,
    '',
    `【问题】\n${params.question.trim() || '请先从整体关系匹配度和相处建议开始分析。'}`,
    '【任务】\n请综合双方盘面，重点分析关系模式、互补点、冲突点、长期走向与相处建议。',
    '【输出要求】\n先给关系结论，再展开最关键的 2 到 4 个重点；每个重点都要写明盘面依据与建议。',
  ].join('\n');
}
