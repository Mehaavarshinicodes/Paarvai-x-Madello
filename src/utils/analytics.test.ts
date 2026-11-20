import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampScrollProgress,
  computeInsights,
  computeStatistics,
  filterWorkers,
  getStoryChapterIndex,
  validateWorkerInput,
} from './analytics';
import type { AnalysisEvent, WorkerRecord } from '../types/vision';

const SAMPLE_WORKERS: WorkerRecord[] = [
  {
    id: 'w-1',
    name: 'Aarav Mehta',
    role: 'Store Lead',
    department: 'Store Management',
    badgeCode: 'PM-101',
    uniformCue: 'Dark navy structured jacket with collar ID tag',
    status: 'active',
    enrolledAt: '2026-10-01T09:00:00.000Z',
  },
  {
    id: 'w-2',
    name: 'Priya Nair',
    role: 'Floor Associate',
    department: 'Floor Operations',
    badgeCode: 'PM-104',
    uniformCue: 'Charcoal knitwear apron and indigo lanyard',
    status: 'active',
    enrolledAt: '2026-10-05T09:00:00.000Z',
  },
];

const SAMPLE_EVENTS: AnalysisEvent[] = [
  {
    id: 'ev-1',
    timestamp: '2026-11-13T10:15:00.000Z',
    source: 'sample_frame',
    totalPeople: 4,
    registeredEmployeesCount: 2,
    unregisteredPeopleCount: 2,
    zonesActive: ['Checkout Counter', 'Apparel Gallery'],
    summary: 'Two registered associates at service desk and two anonymous visitors browsing aisle.',
    detections: [
      {
        trackLabel: 'EMP-01',
        category: 'registered_employee',
        workerId: 'w-1',
        workerName: 'Aarav Mehta',
        workerRole: 'Store Lead',
        zone: 'Checkout Counter',
        visualCue: 'Dark navy structured jacket',
        confidence: 0.91,
        privacyMasked: false,
        box: { ymin: 0.35, xmin: 0.48, ymax: 0.56, xmax: 0.55 },
      },
      {
        trackLabel: 'EMP-02',
        category: 'registered_employee',
        workerId: 'w-2',
        workerName: 'Priya Nair',
        workerRole: 'Floor Associate',
        zone: 'Checkout Counter',
        visualCue: 'Navy uniform top at counter',
        confidence: 0.87,
        privacyMasked: false,
        box: { ymin: 0.36, xmin: 0.54, ymax: 0.57, xmax: 0.6 },
      },
      {
        trackLabel: 'ANON-01',
        category: 'unregistered_person',
        workerId: null,
        workerName: null,
        workerRole: null,
        zone: 'Apparel Gallery',
        visualCue: 'Anonymous visitor posture',
        confidence: 0.94,
        privacyMasked: true,
        box: { ymin: 0.42, xmin: 0.28, ymax: 0.73, xmax: 0.36 },
      },
      {
        trackLabel: 'ANON-02',
        category: 'unregistered_person',
        workerId: null,
        workerName: null,
        workerRole: null,
        zone: 'Apparel Gallery',
        visualCue: 'Anonymous visitor posture',
        confidence: 0.92,
        privacyMasked: true,
        box: { ymin: 0.44, xmin: 0.34, ymax: 0.72, xmax: 0.41 },
      },
    ],
  },
];

test('clampScrollProgress bounds scroll values deterministically', () => {
  assert.equal(clampScrollProgress(-50, 1000), 0);
  assert.equal(clampScrollProgress(500, 1000), 0.5);
  assert.equal(clampScrollProgress(1400, 1000), 1);
  assert.equal(clampScrollProgress(100, 0), 0);
});

test('getStoryChapterIndex maps progress across all 6 scrollytelling stages', () => {
  assert.equal(getStoryChapterIndex(0), 0);
  assert.equal(getStoryChapterIndex(0.2), 1);
  assert.equal(getStoryChapterIndex(0.35), 2);
  assert.equal(getStoryChapterIndex(0.55), 3);
  assert.equal(getStoryChapterIndex(0.75), 4);
  assert.equal(getStoryChapterIndex(0.95), 5);
});

test('validateWorkerInput rejects empty or malformed worker fields', () => {
  const invalid = validateWorkerInput({
    name: '',
    role: 'A',
    department: 'Floor Operations',
    badgeCode: '!',
    uniformCue: 'no',
    status: 'active',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.name);
  assert.ok(invalid.errors.role);
  assert.ok(invalid.errors.badgeCode);
  assert.ok(invalid.errors.uniformCue);

  const valid = validateWorkerInput({
    name: 'Meera Deshmukh',
    role: 'Visual Merchandising',
    department: 'Floor Operations',
    badgeCode: 'PM-208',
    uniformCue: 'Slate blazer with silver lapel pin',
    status: 'active',
  });
  assert.equal(valid.valid, true);
});

test('filterWorkers filters by query and department without mutating input', () => {
  assert.equal(filterWorkers(SAMPLE_WORKERS, '', 'ALL').length, 2);
  assert.equal(filterWorkers(SAMPLE_WORKERS, 'Priya', 'ALL').length, 1);
  assert.equal(filterWorkers(SAMPLE_WORKERS, '', 'Store Management').length, 1);
  assert.equal(filterWorkers(SAMPLE_WORKERS, 'nonexistent', 'ALL').length, 0);
});

test('computeStatistics returns honest empty stats when no events exist', () => {
  const empty = computeStatistics([]);
  assert.equal(empty.totalAnalyses, 0);
  assert.equal(empty.totalSightings, 0);
  assert.equal(empty.zoneBreakdown.length, 0);
});

test('computeStatistics and computeInsights aggregate real events accurately', () => {
  const stats = computeStatistics(SAMPLE_EVENTS);
  assert.equal(stats.totalAnalyses, 1);
  assert.equal(stats.totalSightings, 4);
  assert.equal(stats.registeredEmployeeSightings, 2);
  assert.equal(stats.unregisteredPersonSightings, 2);
  assert.equal(stats.uniqueWorkersObserved, 2);
  assert.equal(stats.activeZonesCount, 2);

  const insights = computeInsights(SAMPLE_EVENTS, SAMPLE_WORKERS);
  assert.ok(insights.length >= 3);
  assert.equal(insights[0].kind, 'measured');
  assert.ok(insights.some((i) => i.kind === 'observation'));
});
