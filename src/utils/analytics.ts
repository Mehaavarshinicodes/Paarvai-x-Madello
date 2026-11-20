import type {
  AnalysisEvent,
  OperationalInsight,
  StoreStatistics,
  StoryChapterMeta,
  WorkerFormInput,
  WorkerRecord,
} from '../types/vision';

export const STORY_CHAPTERS: StoryChapterMeta[] = [
  {
    index: 0,
    id: 'lobby',
    label: 'Lobby',
    eyebrow: 'PaarvAI × Madello',
    headline: 'A clearer view of every store.',
    narrative:
      'Retail intelligence from CCTV footage—with authorised employee recognition and customer privacy at its core.',
    theme: 'dark',
  },
  {
    index: 1,
    id: 'problem',
    label: 'Footage',
    eyebrow: '01. The operational gap',
    headline: 'Hours of footage. Very little clarity.',
    narrative:
      'Retail spaces generate continuous video across aisles, entrances, and service counters. Reviewing recordings manually is slow, inconsistent, and difficult to scale.',
    theme: 'dark',
  },
  {
    index: 2,
    id: 'activity',
    label: 'Activity',
    eyebrow: '02. Operational visibility',
    headline: 'The value is in understanding what happens.',
    narrative:
      'Stores need answers to practical questions: how many visitors enter, how footfall shifts across the day, where people gather, and whether staff are present in active service zones.',
    theme: 'light',
  },
  {
    index: 3,
    id: 'distinction',
    label: 'Distinction',
    eyebrow: '03. Two separate paths',
    headline: 'Recognise the role. Respect the person.',
    narrative:
      'Authorised employees may be matched against restricted worker records using permitted visual and uniform cues. Customers remain anonymous—no names, no identity profiles, no retained facial biometrics.',
    theme: 'dark',
  },
  {
    index: 4,
    id: 'privacy',
    label: 'Boundaries',
    eyebrow: '04. Privacy-aware pipeline',
    headline: 'Intelligence, with boundaries.',
    narrative:
      'CCTV frames pass through role separation before metrics are recorded. Unnecessary identity details are excluded from customer analytics, while access to employee records remains restricted.',
    theme: 'light',
  },
  {
    index: 5,
    id: 'decisions',
    label: 'Live Demo',
    eyebrow: '05. From footage to decisions',
    headline: 'Less reviewing. More understanding.',
    narrative:
      'Operational logs, anonymous footfall counts, zone activity, and authorised employee presence emerge cleanly from the same visual pipeline.',
    theme: 'dark',
  },
];

export function clampScrollProgress(scrollTop: number, maxScroll: number): number {
  if (!Number.isFinite(scrollTop) || !Number.isFinite(maxScroll) || maxScroll <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, scrollTop / maxScroll));
}

export function getStoryChapterIndex(progress: number): number {
  const clamped = Math.max(0, Math.min(1, progress));
  if (clamped < 0.14) return 0;
  if (clamped < 0.30) return 1;
  if (clamped < 0.48) return 2;
  if (clamped < 0.66) return 3;
  if (clamped < 0.84) return 4;
  return 5;
}

export function getStoryChapter(progress: number): StoryChapterMeta {
  return STORY_CHAPTERS[getStoryChapterIndex(progress)];
}

export interface WorkerValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof WorkerFormInput, string>>;
}

export function validateWorkerInput(input: WorkerFormInput): WorkerValidationResult {
  const errors: Partial<Record<keyof WorkerFormInput, string>> = {};

  if (!input.name.trim() || input.name.trim().length < 2) {
    errors.name = 'Enter the registered employee name (at least 2 characters).';
  }
  if (!input.role.trim() || input.role.trim().length < 2) {
    errors.role = 'Specify the store role (for example, Floor Associate).';
  }
  if (!input.badgeCode.trim() || !/^[A-Za-z0-9_-]{3,16}$/.test(input.badgeCode.trim())) {
    errors.badgeCode = 'Badge ID must be 3–16 alphanumeric characters, hyphens, or underscores.';
  }
  if (!input.uniformCue.trim() || input.uniformCue.trim().length < 4) {
    errors.uniformCue = 'Describe the permitted visual cue (for example, Navy apron & collar badge).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function filterWorkers(
  workers: WorkerRecord[],
  searchQuery: string,
  departmentFilter: string,
): WorkerRecord[] {
  const q = searchQuery.trim().toLowerCase();
  return workers.filter((worker) => {
    const matchesDepartment =
      departmentFilter === 'ALL' || worker.department === departmentFilter;
    if (!matchesDepartment) return false;
    if (!q) return true;
    return (
      worker.name.toLowerCase().includes(q) ||
      worker.role.toLowerCase().includes(q) ||
      worker.badgeCode.toLowerCase().includes(q) ||
      worker.department.toLowerCase().includes(q) ||
      worker.uniformCue.toLowerCase().includes(q)
    );
  });
}

export function computeStatistics(events: AnalysisEvent[]): StoreStatistics {
  if (events.length === 0) {
    return {
      totalAnalyses: 0,
      totalSightings: 0,
      registeredEmployeeSightings: 0,
      unregisteredPersonSightings: 0,
      uniqueWorkersObserved: 0,
      activeZonesCount: 0,
      zoneBreakdown: [],
      timelineBuckets: [],
    };
  }

  let registeredEmployeeSightings = 0;
  let unregisteredPersonSightings = 0;
  const uniqueWorkerIds = new Set<string>();
  const zoneMap = new Map<
    string,
    { observations: number; employeeSightings: number; unregisteredSightings: number }
  >();
  const bucketMap = new Map<
    string,
    { totalSightings: number; employeeSightings: number; unregisteredSightings: number }
  >();

  for (const ev of events) {
    registeredEmployeeSightings += ev.registeredEmployeesCount;
    unregisteredPersonSightings += ev.unregisteredPeopleCount;

    const bucketLabel = formatShortTimeBucket(ev.timestamp);
    const existingBucket = bucketMap.get(bucketLabel) ?? {
      totalSightings: 0,
      employeeSightings: 0,
      unregisteredSightings: 0,
    };
    existingBucket.totalSightings += ev.totalPeople;
    existingBucket.employeeSightings += ev.registeredEmployeesCount;
    existingBucket.unregisteredSightings += ev.unregisteredPeopleCount;
    bucketMap.set(bucketLabel, existingBucket);

    for (const det of ev.detections) {
      if (det.category === 'registered_employee' && det.workerId) {
        uniqueWorkerIds.add(det.workerId);
      }
      const zoneName = det.zone.trim() || 'General Floor';
      const existingZone = zoneMap.get(zoneName) ?? {
        observations: 0,
        employeeSightings: 0,
        unregisteredSightings: 0,
      };
      existingZone.observations += 1;
      if (det.category === 'registered_employee') {
        existingZone.employeeSightings += 1;
      } else {
        existingZone.unregisteredSightings += 1;
      }
      zoneMap.set(zoneName, existingZone);
    }
  }

  const zoneBreakdown = Array.from(zoneMap.entries())
    .map(([zone, counts]) => ({ zone, ...counts }))
    .sort((a, b) => b.observations - a.observations);

  const timelineBuckets = Array.from(bucketMap.entries())
    .map(([label, counts]) => ({ label, ...counts }))
    .slice(-10);

  return {
    totalAnalyses: events.length,
    totalSightings: registeredEmployeeSightings + unregisteredPersonSightings,
    registeredEmployeeSightings,
    unregisteredPersonSightings,
    uniqueWorkersObserved: uniqueWorkerIds.size,
    activeZonesCount: zoneBreakdown.length,
    zoneBreakdown,
    timelineBuckets,
  };
}

export function computeInsights(
  events: AnalysisEvent[],
  workers: WorkerRecord[],
): OperationalInsight[] {
  if (events.length === 0) {
    return [];
  }

  const stats = computeStatistics(events);
  const insights: OperationalInsight[] = [];

  insights.push({
    id: 'measured-total-volume',
    kind: 'measured',
    title: 'Recorded frame activity',
    value: `${stats.totalSightings} person sightings across ${stats.totalAnalyses} analysed frames`,
    explanation:
      'Direct aggregate count from processed webcam or uploaded frames. Unregistered visitors are counted anonymously without identity retention.',
    basis: `Measured directly from ${stats.totalAnalyses} stored session events.`,
  });

  if (stats.zoneBreakdown.length > 0) {
    const busiest = stats.zoneBreakdown[0];
    const sharePct =
      stats.totalSightings > 0
        ? Math.round((busiest.observations / stats.totalSightings) * 100)
        : 0;
    insights.push({
      id: 'measured-busiest-zone',
      kind: 'measured',
      title: 'Highest observed zone activity',
      value: `${busiest.zone} (${sharePct}% of sightings)`,
      explanation:
        'Measures where people appeared most frequently across the analysed camera frames during this session.',
      basis: `${busiest.observations} of ${stats.totalSightings} total sightings occurred in ${busiest.zone}.`,
    });
  }

  const activeRegistryCount = workers.filter((w) => w.status === 'active').length;
  const employeeShare =
    stats.totalSightings > 0
      ? Math.round((stats.registeredEmployeeSightings / stats.totalSightings) * 100)
      : 0;

  insights.push({
    id: 'observation-staff-presence',
    kind: 'observation',
    title: 'Authorised employee presence coverage',
    value: `${stats.uniqueWorkersObserved} of ${activeRegistryCount} active staff observed (${employeeShare}% of sightings)`,
    explanation:
      'Indicates whether registered personnel appeared in camera coverage relative to anonymous store visitors. Lower coverage may reflect off-camera duties rather than absence.',
    basis: `Observed across ${stats.totalAnalyses} frames matched against ${activeRegistryCount} active registered workers.`,
  });

  const checkoutZone = stats.zoneBreakdown.find((z) =>
    z.zone.toLowerCase().includes('checkout') || z.zone.toLowerCase().includes('counter'),
  );
  if (checkoutZone) {
    const coverageNote =
      checkoutZone.unregisteredSightings > 0 && checkoutZone.employeeSightings === 0
        ? 'Unregistered visitors observed near checkout with no registered employee detected in those frames.'
        : `${checkoutZone.employeeSightings} employee and ${checkoutZone.unregisteredSightings} anonymous visitor sightings recorded at checkout.`;

    insights.push({
      id: 'observation-checkout-balance',
      kind: 'observation',
      title: 'Service counter balance',
      value: `${checkoutZone.observations} sightings in ${checkoutZone.zone}`,
      explanation: coverageNote,
      basis: 'Operational observation derived by comparing role counts within checkout-tagged zones.',
    });
  }

  return insights;
}

export function formatShortTimeBucket(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
