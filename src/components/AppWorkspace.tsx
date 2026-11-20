import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BarChart3, Camera, Compass, Users, Video } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { WebcamDemo } from './dashboard/WebcamDemo';
import { VideoUploadView } from './dashboard/VideoUploadView';
import { StatisticsLogsView } from './dashboard/StatisticsLogsView';
import { WorkersDatabaseView } from './dashboard/WorkersDatabaseView';
import { InsightsView } from './dashboard/InsightsView';
import type {
  AnalysisEvent,
  DashboardTab,
  WorkerFormInput,
  WorkerRecord,
} from '../types/vision';

interface AppWorkspaceProps {
  onBackToStory: () => void;
}

const NAV_ITEMS: Array<{
  id: DashboardTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'webcam', label: 'Live Webcam', icon: Camera },
  { id: 'video', label: 'Upload Video', icon: Video },
  { id: 'statistics', label: 'Statistics / Logs', icon: BarChart3 },
  { id: 'workers', label: 'Database — Workers', icon: Users },
  { id: 'insights', label: 'Insights', icon: Compass },
];

export const AppWorkspace: React.FC<AppWorkspaceProps> = ({ onBackToStory }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('webcam');
  const [workers, setWorkers] = useState<WorkerRecord[]>([]);
  const [workersLoading, setWorkersLoading] = useState(true);
  const [workersError, setWorkersError] = useState<string | null>(null);

  const [events, setEvents] = useState<AnalysisEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [visionConfigured, setVisionConfigured] = useState<boolean | null>(null);

  const fetchWorkspaceData = useCallback(async () => {
    setWorkersLoading(true);
    setEventsLoading(true);
    try {
      const [healthRes, workersRes, eventsRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/workers'),
        fetch('/api/events'),
      ]);
      if (healthRes.ok) {
        const health = (await healthRes.json()) as { visionConfigured?: boolean };
        setVisionConfigured(Boolean(health.visionConfigured));
      }
      if (workersRes.ok) {
        const wData = (await workersRes.json()) as { workers: WorkerRecord[] };
        setWorkers(wData.workers);
        setWorkersError(null);
      } else {
        setWorkersError('Unable to load registered workers from server.');
      }
      if (eventsRes.ok) {
        const eData = (await eventsRes.json()) as { events: AnalysisEvent[] };
        setEvents(eData.events);
      }
    } catch {
      setWorkersError('Network error while connecting to workspace backend.');
    } finally {
      setWorkersLoading(false);
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  const handleNewEvent = useCallback((event: AnalysisEvent) => {
    setEvents((prev) => [event, ...prev]);
  }, []);

  const handleClearEvents = async () => {
    const res = await fetch('/api/events', { method: 'DELETE' });
    if (res.ok) {
      setEvents([]);
    }
  };

  const handleAddWorker = async (input: WorkerFormInput) => {
    const res = await fetch('/api/workers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = (await res.json()) as { worker?: WorkerRecord; error?: string };
    if (!res.ok || !data.worker) {
      throw new Error(data.error || 'Failed to register worker.');
    }
    setWorkers((prev) => [data.worker!, ...prev]);
  };

  const handleUpdateWorker = async (id: string, input: WorkerFormInput) => {
    const res = await fetch(`/api/workers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = (await res.json()) as { worker?: WorkerRecord; error?: string };
    if (!res.ok || !data.worker) {
      throw new Error(data.error || 'Failed to update worker.');
    }
    setWorkers((prev) => prev.map((w) => (w.id === id ? data.worker! : w)));
  };

  const handleDeleteWorker = async (id: string) => {
    const res = await fetch(`/api/workers/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setWorkers((prev) => prev.filter((w) => w.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-[#09090D] text-white flex flex-col">
      {/* Slim Workspace Top Navigation */}
      <header className="sticky top-0 z-30 bg-[#09090D]/95 border-b border-white/10">
        <div className="max-w-[1360px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-6 shrink-0">
            <BrandMark tone="dark" onClick={onBackToStory} />
          </div>

          <nav
            aria-label="Application sections"
            className="hidden md:flex items-center gap-2"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#5146C8] text-white'
                      : 'text-[#8B8B98] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onBackToStory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-white/15 text-[#E9E9EF] rounded-md hover:border-white/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Story</span>
            </button>
          </div>
        </div>

        {/* Mobile Tab Strip */}
        <div className="md:hidden border-t border-white/10 px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                  active ? 'bg-[#5146C8] text-white' : 'text-[#8B8B98] bg-[#15151C]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Workspace Content */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-5 sm:px-8 py-8">
        {activeTab === 'webcam' && (
          <WebcamDemo
            latestEvent={events[0] ?? null}
            onNewEvent={handleNewEvent}
            visionConfigured={visionConfigured}
          />
        )}
        {activeTab === 'video' && (
          <VideoUploadView
            latestEvent={events[0] ?? null}
            onNewEvent={handleNewEvent}
            visionConfigured={visionConfigured}
          />
        )}
        {activeTab === 'statistics' && (
          <StatisticsLogsView
            events={events}
            loading={eventsLoading}
            onClearEvents={handleClearEvents}
            onGoToWebcam={() => setActiveTab('webcam')}
          />
        )}
        {activeTab === 'workers' && (
          <WorkersDatabaseView
            workers={workers}
            loading={workersLoading}
            error={workersError}
            onAddWorker={handleAddWorker}
            onUpdateWorker={handleUpdateWorker}
            onDeleteWorker={handleDeleteWorker}
          />
        )}
        {activeTab === 'insights' && (
          <InsightsView
            events={events}
            workers={workers}
            onGoToWebcam={() => setActiveTab('webcam')}
          />
        )}
      </main>
    </div>
  );
};
