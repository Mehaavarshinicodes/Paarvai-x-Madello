export type AppViewMode = 'story' | 'app';

export type DashboardTab = 'webcam' | 'video' | 'statistics' | 'workers' | 'insights';

export type WorkerStatus = 'active' | 'off_shift';

export type StoreDepartment =
  | 'Floor Operations'
  | 'Checkout & Service'
  | 'Inventory & Backroom'
  | 'Store Management';

export interface WorkerRecord {
  id: string;
  name: string;
  role: string;
  department: StoreDepartment;
  badgeCode: string;
  uniformCue: string;
  status: WorkerStatus;
  enrolledAt: string;
}

export interface WorkerFormInput {
  name: string;
  role: string;
  department: StoreDepartment;
  badgeCode: string;
  uniformCue: string;
  status: WorkerStatus;
}

export type PersonCategory = 'registered_employee' | 'unregistered_person';

export interface BoundingBoxNormalized {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface DetectedPerson {
  trackLabel: string;
  category: PersonCategory;
  workerId: string | null;
  workerName: string | null;
  workerRole: string | null;
  zone: string;
  visualCue: string;
  confidence: number;
  privacyMasked: boolean;
  box: BoundingBoxNormalized;
}

export interface AnalysisEvent {
  id: string;
  timestamp: string;
  source: 'webcam' | 'sample_frame' | 'uploaded_frame' | 'uploaded_video';
  totalPeople: number;
  registeredEmployeesCount: number;
  unregisteredPeopleCount: number;
  zonesActive: string[];
  summary: string;
  detections: DetectedPerson[];
}

export interface VisionAnalysisResponse {
  event: AnalysisEvent;
  privacyGuarantee: string;
}

export interface ZoneStat {
  zone: string;
  observations: number;
  employeeSightings: number;
  unregisteredSightings: number;
}

export interface TimeBucketStat {
  label: string;
  totalSightings: number;
  employeeSightings: number;
  unregisteredSightings: number;
}

export interface StoreStatistics {
  totalAnalyses: number;
  totalSightings: number;
  registeredEmployeeSightings: number;
  unregisteredPersonSightings: number;
  uniqueWorkersObserved: number;
  activeZonesCount: number;
  zoneBreakdown: ZoneStat[];
  timelineBuckets: TimeBucketStat[];
}

export interface OperationalInsight {
  id: string;
  kind: 'measured' | 'observation';
  title: string;
  value: string;
  explanation: string;
  basis: string;
}

export interface StoryChapterMeta {
  index: number;
  id: string;
  label: string;
  eyebrow: string;
  headline: string;
  narrative: string;
  theme: 'dark' | 'light';
}
