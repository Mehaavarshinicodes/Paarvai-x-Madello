import React, { useMemo, useState } from 'react';
import { BarChart3, Search, Trash2, Video } from 'lucide-react';
import type { AnalysisEvent } from '../../types/vision';
import { computeStatistics, formatTimestamp } from '../../utils/analytics';

interface StatisticsLogsViewProps {
  events: AnalysisEvent[];
  loading: boolean;
  onClearEvents: () => Promise<void>;
  onGoToWebcam: () => void;
}

export const StatisticsLogsView: React.FC<StatisticsLogsViewProps> = ({
  events,
  loading,
  onClearEvents,
  onGoToWebcam,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [confirmClear, setConfirmClear] = useState(false);

  const stats = useMemo(() => computeStatistics(events), [events]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((ev) => {
      const matchesSource = sourceFilter === 'ALL' || ev.source === sourceFilter;
      if (!matchesSource) return false;
      if (!q) return true;
      return (
        ev.summary.toLowerCase().includes(q) ||
        ev.zonesActive.some((z) => z.toLowerCase().includes(q)) ||
        ev.detections.some((d) => d.workerName?.toLowerCase().includes(q))
      );
    });
  }, [events, searchQuery, sourceFilter]);

  const maxBucketValue = Math.max(
    1,
    ...stats.timelineBuckets.map((b) => b.totalSightings),
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 bg-white/5 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-[#15151C] border border-white/10 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
            Statistics &amp; Event Logs
          </h1>
          <p className="text-sm text-[#8B8B98] mt-1">
            Recorded frame counts and zone sightings. Customer identities are never logged.
          </p>
        </div>

        {events.length > 0 && (
          <div className="flex items-center gap-2">
            {confirmClear ? (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    await onClearEvents();
                    setConfirmClear(false);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold bg-[#5146C8] text-white rounded-md hover:bg-[#4339B4] cursor-pointer"
                >
                  Confirm Clear Logs
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-3 py-2 text-xs font-medium border border-white/15 text-[#8B8B98] rounded-md hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-white/15 text-[#E9E9EF] rounded-md hover:border-white/35 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Clear Session Logs</span>
              </button>
            )}
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <div className="border border-white/12 bg-[#15151C] rounded-lg p-10 text-center max-w-2xl mx-auto">
          <div className="w-11 h-11 rounded-md border border-white/15 bg-[#09090D] flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-5 h-5 text-[#8B8B98]" aria-hidden="true" />
          </div>
          <h2 className="font-display font-semibold text-lg text-white mb-2">
            No detection events recorded yet
          </h2>
          <p className="text-sm text-[#8B8B98] leading-relaxed mb-6">
            Statistics and event logs populate strictly from real frames analysed in the Webcam
            workspace. Run a live camera scan or test the sample store frame to generate events.
          </p>
          <button
            type="button"
            onClick={onGoToWebcam}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-[#5146C8] text-white rounded-md hover:bg-[#4339B4] transition-colors cursor-pointer"
          >
            <Video className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Open Webcam Demo</span>
          </button>
        </div>
      ) : (
        <>
          {/* Aggregate KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-md bg-[#15151C] border border-white/10">
              <div className="text-xs text-[#8B8B98] mb-1">Frames Analysed</div>
              <div className="text-2xl font-display font-bold text-white tabular-nums">
                {stats.totalAnalyses}
              </div>
              <div className="text-[11px] text-[#8B8B98] mt-1">Processed scans</div>
            </div>
            <div className="p-5 rounded-md bg-[#15151C] border border-white/10">
              <div className="text-xs text-[#8B8B98] mb-1">Registered Employee Sightings</div>
              <div className="text-2xl font-display font-bold text-[#A69FF4] tabular-nums">
                {stats.registeredEmployeeSightings}
              </div>
              <div className="text-[11px] text-[#8B8B98] mt-1 tabular-nums">
                {stats.uniqueWorkersObserved} unique staff matched
              </div>
            </div>
            <div className="p-5 rounded-md bg-[#15151C] border border-white/10">
              <div className="text-xs text-[#8B8B98] mb-1">Anonymous Footfall Counts</div>
              <div className="text-2xl font-display font-bold text-white tabular-nums">
                {stats.unregisteredPersonSightings}
              </div>
              <div className="text-[11px] text-[#8B8B98] mt-1">Non-indexed person sightings</div>
            </div>
            <div className="p-5 rounded-md bg-[#15151C] border border-white/10">
              <div className="text-xs text-[#8B8B98] mb-1">Active Store Zones</div>
              <div className="text-2xl font-display font-bold text-white tabular-nums">
                {stats.activeZonesCount}
              </div>
              <div className="text-[11px] text-[#8B8B98] mt-1">Distinct areas observed</div>
            </div>
          </div>

          {/* Activity by Time & Zone Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 p-6 rounded-md bg-[#15151C] border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display font-semibold text-base text-white">
                  Sightings by Time Bucket
                </h2>
                <div className="flex items-center gap-4 text-xs text-[#8B8B98]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#5146C8] rounded-xs" />
                    Registered Staff
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#8B8B98] rounded-xs" />
                    Anonymous Visitors
                  </span>
                </div>
              </div>

              <div className="h-44 flex items-end gap-3 border-b border-white/10 pb-2">
                {stats.timelineBuckets.map((bucket) => {
                  const empHeight = Math.round(
                    (bucket.employeeSightings / maxBucketValue) * 140,
                  );
                  const anonHeight = Math.round(
                    (bucket.unregisteredSightings / maxBucketValue) * 140,
                  );
                  return (
                    <div
                      key={bucket.label}
                      className="flex-1 flex flex-col items-center justify-end gap-1"
                    >
                      <div className="text-[11px] font-mono-tabular text-[#8B8B98]">
                        {bucket.totalSightings}
                      </div>
                      <div className="w-full max-w-[36px] flex flex-col justify-end rounded-xs overflow-hidden">
                        {anonHeight > 0 && (
                          <div
                            style={{ height: `${anonHeight}px` }}
                            className="w-full bg-[#8B8B98]"
                            title={`Anonymous: ${bucket.unregisteredSightings}`}
                          />
                        )}
                        {empHeight > 0 && (
                          <div
                            style={{ height: `${empHeight}px` }}
                            className="w-full bg-[#5146C8]"
                            title={`Registered Staff: ${bucket.employeeSightings}`}
                          />
                        )}
                      </div>
                      <div className="text-[11px] font-mono-tabular text-[#8B8B98] mt-1">
                        {bucket.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-5 p-6 rounded-md bg-[#15151C] border border-white/10">
              <h2 className="font-display font-semibold text-base text-white mb-4">
                Zone Breakdown
              </h2>
              <div className="space-y-3.5">
                {stats.zoneBreakdown.map((z) => {
                  const widthPct =
                    stats.totalSightings > 0
                      ? Math.round((z.observations / stats.totalSightings) * 100)
                      : 0;
                  return (
                    <div key={z.zone} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white font-medium">{z.zone}</span>
                        <span className="text-[#8B8B98] font-mono-tabular">
                          {z.observations} sightings ({z.employeeSightings} staff ·{' '}
                          {z.unregisteredSightings} anon)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-xs overflow-hidden">
                        <div
                          style={{ width: `${Math.max(4, widthPct)}%` }}
                          className="h-full bg-[#5146C8]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Event Log Table */}
          <div className="rounded-md bg-[#15151C] border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-display font-semibold text-base text-white">
                Recent Event Log
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search
                    className="w-3.5 h-3.5 text-[#8B8B98] absolute left-3 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by zone or staff..."
                    aria-label="Filter event log"
                    className="pl-8 pr-3 py-1.5 text-xs bg-[#09090D] border border-white/15 rounded-md text-white placeholder:text-[#8B8B98] focus:outline-none focus:border-[#5146C8]"
                  />
                </div>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  aria-label="Filter by source"
                  className="px-3 py-1.5 text-xs bg-[#09090D] border border-white/15 rounded-md text-white focus:outline-none focus:border-[#5146C8]"
                >
                  <option value="ALL">All Sources</option>
                  <option value="webcam">Webcam</option>
                  <option value="sample_frame">Sample Store Frame</option>
                  <option value="uploaded_frame">Uploaded Frame</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[#8B8B98]">
                    <th className="py-3 px-4 font-medium">Timestamp</th>
                    <th className="py-3 px-4 font-medium">Source</th>
                    <th className="py-3 px-4 font-medium text-right">Staff</th>
                    <th className="py-3 px-4 font-medium text-right">Anonymous</th>
                    <th className="py-3 px-4 font-medium">Zones Observed</th>
                    <th className="py-3 px-4 font-medium">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {filteredEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-mono-tabular text-[#E9E9EF] whitespace-nowrap">
                        {formatTimestamp(ev.timestamp)}
                      </td>
                      <td className="py-3 px-4 text-[#8B8B98] whitespace-nowrap">
                        {ev.source === 'webcam'
                          ? 'Live Webcam'
                          : ev.source === 'sample_frame'
                            ? 'Sample Store Frame'
                            : 'Uploaded Frame'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular text-[#A69FF4]">
                        {ev.registeredEmployeesCount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular text-white">
                        {ev.unregisteredPeopleCount}
                      </td>
                      <td className="py-3 px-4 text-[#E9E9EF]">
                        {ev.zonesActive.join(', ') || 'General Floor'}
                      </td>
                      <td className="py-3 px-4 text-[#8B8B98] max-w-md">{ev.summary}</td>
                    </tr>
                  ))}
                  {filteredEvents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#8B8B98]">
                        No log entries match your current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
