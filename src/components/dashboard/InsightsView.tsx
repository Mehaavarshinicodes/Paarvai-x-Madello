import React, { useMemo } from 'react';
import { Compass, Video } from 'lucide-react';
import type { AnalysisEvent, WorkerRecord } from '../../types/vision';
import { computeInsights, computeStatistics } from '../../utils/analytics';

interface InsightsViewProps {
  events: AnalysisEvent[];
  workers: WorkerRecord[];
  onGoToWebcam: () => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  events,
  workers,
  onGoToWebcam,
}) => {
  const insights = useMemo(() => computeInsights(events, workers), [events, workers]);
  const stats = useMemo(() => computeStatistics(events), [events]);

  return (
    <div className="space-y-8">
      <div className="pb-5 border-b border-white/10">
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
          Operational Insights
        </h1>
        <p className="text-sm text-[#8B8B98] mt-1">
          Direct measurements and bounded operational observations derived from recorded camera
          scans.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="border border-white/12 bg-[#15151C] rounded-lg p-10 text-center max-w-2xl mx-auto">
          <div className="w-11 h-11 rounded-md border border-white/15 bg-[#09090D] flex items-center justify-center mx-auto mb-4">
            <Compass className="w-5 h-5 text-[#8B8B98]" aria-hidden="true" />
          </div>
          <h2 className="font-display font-semibold text-lg text-white mb-2">
            Waiting for recorded store activity
          </h2>
          <p className="text-sm text-[#8B8B98] leading-relaxed mb-6">
            Insights are never generated without underlying frame observations. Run at least one
            camera scan or test frame in the Webcam view to inspect zone patterns and employee
            coverage.
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
          {/* Measured vs Observational Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {insights.map((item) => (
              <div
                key={item.id}
                className="p-6 rounded-md bg-[#15151C] border border-white/10 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span
                      className={`text-[11px] font-semibold tracking-wide ${
                        item.kind === 'measured' ? 'text-[#A69FF4]' : 'text-[#8B8B98]'
                      }`}
                    >
                      {item.kind === 'measured' ? 'Measured Fact' : 'Operational Observation'}
                    </span>
                  </div>
                  <h2 className="font-display font-semibold text-lg text-white mb-1.5">
                    {item.title}
                  </h2>
                  <div className="text-base font-medium text-[#E9E9EF] mb-3 tabular-nums">
                    {item.value}
                  </div>
                  <p className="font-editorial text-sm text-[#8B8B98] leading-relaxed">
                    {item.explanation}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/8 text-[11px] text-[#8B8B98]">
                  Basis: {item.basis}
                </div>
              </div>
            ))}
          </div>

          {/* Zone Balance Comparison */}
          {stats.zoneBreakdown.length > 0 && (
            <div className="p-6 rounded-md bg-[#15151C] border border-white/10">
              <h2 className="font-display font-semibold text-base text-white mb-2">
                Zone Composition Summary
              </h2>
              <p className="text-xs text-[#8B8B98] mb-5">
                Compares registered employee sightings against anonymous visitor counts per observed
                area.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.zoneBreakdown.map((z) => (
                  <div
                    key={z.zone}
                    className="p-4 rounded-md bg-[#09090D] border border-white/10 space-y-2"
                  >
                    <div className="text-sm font-semibold text-white">{z.zone}</div>
                    <div className="flex items-center justify-between text-xs text-[#8B8B98]">
                      <span>Registered Employees</span>
                      <span className="font-mono-tabular text-[#A69FF4]">
                        {z.employeeSightings}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#8B8B98]">
                      <span>Anonymous Visitors</span>
                      <span className="font-mono-tabular text-white">
                        {z.unregisteredSightings}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
