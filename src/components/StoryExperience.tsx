import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Eye, ShieldCheck, Users } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { StoreScene3D } from './StoreScene3D';
import {
  STORY_CHAPTERS,
  clampScrollProgress,
  getStoryChapterIndex,
} from '../utils/analytics';
import storeCctvUrl from '../assets/images/store_cctv_ceiling_1794562838043.jpg';
import opticalSensorUrl from '../assets/images/optical_sensor_studio_1794562838292.jpg';

interface StoryExperienceProps {
  onEnterDemo: () => void;
  reducedMotion: boolean;
}

export const StoryExperience: React.FC<StoryExperienceProps> = ({
  onEnterDemo,
  reducedMotion,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeChapter, setActiveChapter] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const totalScrollable = Math.max(1, container.offsetHeight - window.innerHeight);
      const currentScroll = Math.max(0, -rect.top);
      const nextProgress = clampScrollProgress(currentScroll, totalScrollable);
      setScrollProgress(nextProgress);
      setActiveChapter(getStoryChapterIndex(nextProgress));
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const scrollToChapter = (index: number) => {
    const target = sectionRefs.current[index];
    if (!target) return;
    target.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="relative bg-[#09090D] text-white">
      {/* Top Bar Contract: 3 clean zones separated by gap-8 */}
      <header className="fixed top-0 inset-x-0 z-40 bg-[#09090D]/92 border-b border-white/10">
        <div className="max-w-[1360px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-8">
          <BrandMark
            tone="dark"
            onClick={() => scrollToChapter(0)}
          />

          <nav
            aria-label="Story chapters"
            className="hidden lg:flex items-center gap-7 text-[13px] font-medium text-[#8B8B98]"
          >
            {STORY_CHAPTERS.slice(0, 5).map((ch) => {
              const isActive = activeChapter === ch.index;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => scrollToChapter(ch.index)}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b ${
                    isActive
                      ? 'text-white border-[#5146C8]'
                      : 'text-[#8B8B98] border-transparent hover:text-white'
                  }`}
                >
                  {ch.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onEnterDemo}
              className="px-4 py-2 text-[13px] font-semibold bg-[#5146C8] text-white rounded-md hover:bg-[#4339B4] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Explore live demo
            </button>
          </div>
        </div>
      </header>

      {/* Main Scrollytelling Wrapper with Sticky 3D Retail Workplace */}
      <div ref={scrollContainerRef} className="relative">
        {/* Sticky 3D Viewport Layer */}
        <div className="sticky top-0 h-screen w-full overflow-hidden pointer-events-none z-0">
          <StoreScene3D
            scrollProgress={scrollProgress}
            chapterIndex={activeChapter}
            reducedMotion={reducedMotion}
          />
          {/* Subtle readability gradient scrim */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[#09090D]/60 lg:bg-transparent lg:bg-gradient-to-r lg:from-[#09090D]/82 lg:via-[#09090D]/24 lg:to-transparent"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#09090D] via-[#09090D]/72 to-transparent"
          />
        </div>

        {/* Floating Chapter Progress Rail (Desktop) */}
        <aside
          aria-label="Story progress"
          className="hidden xl:flex fixed right-8 top-1/2 -translate-y-1/2 z-30 flex-col gap-3 bg-[#09090D]/90 border border-white/10 rounded-lg p-3"
        >
          {STORY_CHAPTERS.map((ch) => {
            const current = activeChapter === ch.index;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => scrollToChapter(ch.index)}
                aria-label={`Jump to ${ch.label}`}
                className="group flex items-center justify-end gap-2.5 text-right cursor-pointer py-0.5"
              >
                <span
                  className={`text-[11px] font-medium transition-colors whitespace-nowrap ${
                    current ? 'text-white' : 'text-[#8B8B98] group-hover:text-white'
                  }`}
                >
                  {ch.label}
                </span>
                <span
                  className={`block h-1.5 rounded-sm transition-all ${
                    current ? 'w-5 bg-[#5146C8]' : 'w-2 bg-white/25 group-hover:bg-white/50'
                  }`}
                />
              </button>
            );
          })}
        </aside>

        {/* Scroll Chapters Overlay */}
        <div className="relative z-10 -mt-[100vh]">
          {/* Chapter 0: Hero Retail Intelligence Lobby */}
          <section
            ref={(el) => {
              sectionRefs.current[0] = el;
            }}
            id="lobby"
            className="min-h-screen flex flex-col justify-between pt-28 pb-12 px-5 sm:px-8 max-w-[1360px] mx-auto"
          >
            <div className="max-w-lg my-auto">
              <p className="text-[12px] sm:text-[13px] font-medium tracking-wide text-[#8B8B98] mb-4">
                Understand store activity · Recognise staff · Keep customers private
              </p>
              <h1 className="font-display font-bold text-[clamp(2.35rem,4.5vw,3.85rem)] leading-[1.08] tracking-tight text-white text-balance mb-6">
                A clearer view of every store.
              </h1>
              <p className="font-editorial text-lg sm:text-[19px] leading-relaxed text-[#E9E9EF]/90 mb-8 max-w-lg">
                Retail intelligence from CCTV footage—with employee recognition and customer privacy
                at its core.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => scrollToChapter(1)}
                  className="inline-flex items-center gap-2.5 px-5 py-3 text-sm font-semibold bg-white text-[#09090D] rounded-md hover:bg-[#E9E9EF] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Begin the walkthrough</span>
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onEnterDemo}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold border border-white/25 text-white rounded-md bg-[#09090D]/80 hover:border-white/50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Open live workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/10 text-xs text-[#8B8B98]">
              <div className="flex flex-wrap items-center gap-6">
                <span className="inline-flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#5146C8]" aria-hidden="true" />
                  <span>Authorised Registered Employees (Service &amp; Floor)</span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#8B8B98]" aria-hidden="true" />
                  <span>Anonymous Visitors (Non-Indexed Flow)</span>
                </span>
              </div>
              <span>Scroll to step through the 3D retail environment</span>
            </div>
          </section>

          {/* Chapter 1: Section A — The Problem */}
          <section
            ref={(el) => {
              sectionRefs.current[1] = el;
            }}
            id="problem"
            className="min-h-screen flex items-center py-24 px-5 sm:px-8 max-w-[1360px] mx-auto"
          >
            <div className="w-full max-w-[560px] bg-[#09090D]/86 border border-white/12 rounded-lg p-7 sm:p-9">
              <p className="text-xs font-semibold tracking-wider text-[#8B8B98] mb-3">
                01. The operational gap
              </p>
              <h2 className="font-display font-bold text-3xl sm:text-4xl leading-tight text-white text-balance mb-5">
                Hours of footage. Very little clarity.
              </h2>
              <p className="font-editorial text-base sm:text-[17px] leading-relaxed text-[#E9E9EF]/85 mb-8">
                Retail spaces record continuous video streams from opening to close. Reviewing raw
                footage manually to verify floor coverage or understand busy hours is slow,
                inconsistent, and impossible to scale across shifts.
              </p>

              {/* Restrained temporal filmstrip illustrating continuous footage */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[#8B8B98]">
                  <span>Unindexed CCTV Timeline</span>
                  <span className="font-mono-tabular">Continuous Stream</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {['09:15', '12:40', '16:05', '19:30'].map((timeLabel, idx) => (
                    <div
                      key={timeLabel}
                      className="border border-white/10 rounded-md overflow-hidden bg-[#15151C]"
                    >
                      <div className="aspect-video overflow-hidden bg-[#09090D] relative">
                        <img
                          src={storeCctvUrl}
                          alt={`Store camera feed sample frame at ${timeLabel}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover opacity-80"
                          style={{
                            objectPosition: `${35 + idx * 14}% 50%`,
                            filter: `grayscale(35%) brightness(${0.92 - idx * 0.06})`,
                          }}
                        />
                      </div>
                      <div className="px-2.5 py-1.5 flex items-center justify-between text-[11px] text-[#8B8B98] font-mono-tabular">
                        <span>CAM-01</span>
                        <span>{timeLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Chapter 2: Section B — The Need */}
          <section
            ref={(el) => {
              sectionRefs.current[2] = el;
            }}
            id="activity"
            className="min-h-screen flex items-center py-24 px-5 sm:px-8 max-w-[1360px] mx-auto"
          >
            <div className="w-full max-w-[560px] bg-[#FFFFFF]/94 text-[#09090D] border border-[#E9E9EF] rounded-lg p-7 sm:p-9">
              <p className="text-xs font-semibold tracking-wider text-[#5146C8] mb-3">
                02. Operational visibility
              </p>
              <h2 className="font-display font-bold text-3xl sm:text-4xl leading-tight text-[#09090D] text-balance mb-5">
                The value is in understanding what happens.
              </h2>
              <p className="font-editorial text-base sm:text-[17px] leading-relaxed text-[#343440] mb-7">
                Collecting more video rarely helps store teams. What matters is turning raw frames
                into structured answers to practical operational questions:
              </p>

              <ul className="divide-y divide-[#E9E9EF] border-y border-[#E9E9EF] text-sm">
                <li className="py-3 flex items-baseline justify-between gap-4">
                  <span className="font-semibold text-[#09090D]">
                    How many people are visiting?
                  </span>
                  <span className="text-xs text-[#646472] whitespace-nowrap">
                    Anonymous count
                  </span>
                </li>
                <li className="py-3 flex items-baseline justify-between gap-4">
                  <span className="font-semibold text-[#09090D]">
                    How does activity change across time?
                  </span>
                  <span className="text-xs text-[#646472] whitespace-nowrap">
                    Timestamped logs
                  </span>
                </li>
                <li className="py-3 flex items-baseline justify-between gap-4">
                  <span className="font-semibold text-[#09090D]">
                    Which areas experience more footfall?
                  </span>
                  <span className="text-xs text-[#646472] whitespace-nowrap">
                    Zone distribution
                  </span>
                </li>
                <li className="py-3 flex items-baseline justify-between gap-4">
                  <span className="font-semibold text-[#09090D]">
                    Are employees present in operational zones?
                  </span>
                  <span className="text-xs text-[#5146C8] font-medium whitespace-nowrap">
                    Registered staff check
                  </span>
                </li>
              </ul>

              <p className="mt-5 text-xs leading-relaxed text-[#646472]">
                In the live demo ahead, frame counts, zone observations, and registered employee
                checks reflect real inference on the camera or test frames you run. Multi-camera
                continuous floor heatmaps represent full-store deployment workflows.
              </p>
            </div>
          </section>

          {/* Chapter 3: Section C — Employee & Customer Distinction */}
          <section
            ref={(el) => {
              sectionRefs.current[3] = el;
            }}
            id="distinction"
            className="min-h-screen flex items-center py-24 px-5 sm:px-8 max-w-[1360px] mx-auto"
          >
            <div className="w-full max-w-[600px] bg-[#09090D]/88 border border-white/12 rounded-lg p-7 sm:p-9">
              <p className="text-xs font-semibold tracking-wider text-[#8B8B98] mb-3">
                03. Two separate processing paths
              </p>
              <h2 className="font-display font-bold text-3xl sm:text-4xl leading-tight text-white text-balance mb-4">
                Recognise the role. Respect the person.
              </h2>
              <p className="font-editorial text-base sm:text-[17px] leading-relaxed text-[#E9E9EF]/85 mb-8">
                In the 3D scene behind this view, registered employees and shoppers occupy the same
                floor—yet the system processes them through fundamentally different pathways.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Registered Employee Path */}
                <div className="border border-[#5146C8]/60 bg-[#15151C] rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold tracking-wide text-[#A69FF4]">
                      Registered Employees
                    </span>
                    <Users className="w-4 h-4 text-[#A69FF4]" aria-hidden="true" />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-white mb-3">
                    Authorised role matching
                  </h3>
                  <ul className="space-y-2.5 text-sm text-[#E9E9EF]/85 leading-relaxed">
                    <li>
                      Limited strictly to employees enrolled in the authorised worker registry.
                    </li>
                    <li>
                      Uses permitted uniform, badge, and authorised visual matching cues.
                    </li>
                    <li>
                      Logs shift presence against restricted worker records—without exposing raw
                      biometric embeddings in the interface.
                    </li>
                  </ul>
                </div>

                {/* Customer Path */}
                <div className="border border-white/15 bg-[#15151C] rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold tracking-wide text-[#8B8B98]">
                      Customers &amp; Visitors
                    </span>
                    <ShieldCheck className="w-4 h-4 text-[#8B8B98]" aria-hidden="true" />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-white mb-3">
                    Anonymous spatial counts
                  </h3>
                  <ul className="space-y-2.5 text-sm text-[#E9E9EF]/85 leading-relaxed">
                    <li>
                      Never identified by name, matched to profiles, or tracked across visits.
                    </li>
                    <li>
                      No customer facial biometrics or personal identity details are stored.
                    </li>
                    <li>
                      Visual face regions are masked in the live overlay; only anonymous counts and
                      zone presence are recorded.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Chapter 4: Section D — Privacy-Aware Processing */}
          <section
            ref={(el) => {
              sectionRefs.current[4] = el;
            }}
            id="privacy"
            className="min-h-screen flex items-center py-24 px-5 sm:px-8 max-w-[1360px] mx-auto"
          >
            <div className="w-full max-w-[680px] bg-[#FFFFFF]/94 text-[#09090D] border border-[#E9E9EF] rounded-lg p-7 sm:p-9">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-7 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold tracking-wider text-[#5146C8] mb-3">
                      04. Privacy-aware pipeline
                    </p>
                    <h2 className="font-display font-bold text-3xl sm:text-4xl leading-tight text-[#09090D] text-balance mb-4">
                      Intelligence, with boundaries.
                    </h2>
                    <p className="font-editorial text-base leading-relaxed text-[#343440] mb-6">
                      Frames analysed in this demo are evaluated transiently in memory and
                      immediately discarded. Only structured counts, zone tags, and authorised
                      worker sightings persist to session logs.
                    </p>
                  </div>

                  {/* Clean 4-step pipeline */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-[#E9E9EF]">
                    <div className="p-3.5 rounded-md bg-[#F7F7FA] border border-[#E9E9EF]">
                      <div className="text-xs font-mono-tabular text-[#5146C8] mb-1">Step 01</div>
                      <div className="text-sm font-semibold text-[#09090D]">CCTV Frame Input</div>
                      <p className="text-xs text-[#646472] mt-1">
                        Single frame captured from live webcam or test image.
                      </p>
                    </div>
                    <div className="p-3.5 rounded-md bg-[#F7F7FA] border border-[#E9E9EF]">
                      <div className="text-xs font-mono-tabular text-[#5146C8] mb-1">Step 02</div>
                      <div className="text-sm font-semibold text-[#09090D]">Role Separation</div>
                      <p className="text-xs text-[#646472] mt-1">
                        Distinguish enrolled staff cues from non-registered people.
                      </p>
                    </div>
                    <div className="p-3.5 rounded-md bg-[#F7F7FA] border border-[#E9E9EF]">
                      <div className="text-xs font-mono-tabular text-[#5146C8] mb-1">Step 03</div>
                      <div className="text-sm font-semibold text-[#09090D]">Identity Exclusion</div>
                      <p className="text-xs text-[#646472] mt-1">
                        Mask non-registered faces; discard raw frame pixels after scan.
                      </p>
                    </div>
                    <div className="p-3.5 rounded-md bg-[#F7F7FA] border border-[#E9E9EF]">
                      <div className="text-xs font-mono-tabular text-[#5146C8] mb-1">Step 04</div>
                      <div className="text-sm font-semibold text-[#09090D]">Aggregated Insights</div>
                      <p className="text-xs text-[#646472] mt-1">
                        Record anonymous zone volume and restricted worker logs.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 flex flex-col">
                  <div className="h-full min-h-[240px] rounded-md overflow-hidden bg-[#09090D] border border-[#E9E9EF] relative">
                    <img
                      src={opticalSensorUrl}
                      alt="Architectural anodized optical dome camera hardware"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-[#09090D]/90 to-transparent text-white">
                      <p className="text-xs font-medium text-[#E9E9EF]">
                        Transient optical inference · Zero customer frame retention
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Chapter 5: Section E & Transition into Live Demo */}
          <section
            ref={(el) => {
              sectionRefs.current[5] = el;
            }}
            id="decisions"
            className="min-h-screen flex items-center py-24 px-5 sm:px-8 max-w-[1360px] mx-auto"
          >
            <div className="w-full max-w-[640px] bg-[#09090D]/90 border border-white/15 rounded-lg p-7 sm:p-10">
              <p className="text-xs font-semibold tracking-wider text-[#A69FF4] mb-3">
                05. From footage to decisions
              </p>
              <h2 className="font-display font-bold text-3xl sm:text-4xl leading-tight text-white text-balance mb-4">
                Less reviewing. More understanding.
              </h2>
              <p className="font-editorial text-base sm:text-[17px] leading-relaxed text-[#E9E9EF]/85 mb-8">
                Every stage of the pipeline surfaces directly inside the operational workspace—giving
                store teams live camera verification, timestamped logs, restricted worker management,
                and factual activity observations.
              </p>

              {/* Workspace Module Preview Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-9">
                {[
                  { title: 'Webcam', desc: 'Live detection & privacy mask' },
                  { title: 'Statistics / Logs', desc: 'Real session event history' },
                  { title: 'Database — Workers', desc: 'Access-controlled staff list' },
                  { title: 'Insights', desc: 'Measured zone observations' },
                ].map((mod) => (
                  <div
                    key={mod.title}
                    className="p-4 rounded-md bg-[#15151C] border border-white/10"
                  >
                    <div className="text-sm font-semibold text-white mb-1">{mod.title}</div>
                    <p className="text-xs text-[#8B8B98] leading-snug">{mod.desc}</p>
                  </div>
                ))}
              </div>

              <div className="pt-8 border-t border-white/12 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h3 className="font-display font-bold text-2xl text-white mb-1.5">
                    See the system in action.
                  </h3>
                  <p className="font-editorial text-sm sm:text-base text-[#E9E9EF]/80">
                    Move from the story to a live demonstration of privacy-aware retail intelligence.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onEnterDemo}
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-semibold bg-[#5146C8] text-white rounded-md hover:bg-[#4339B4] transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <Eye className="w-4 h-4" aria-hidden="true" />
                  <span>Explore the live demo</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Quiet Editorial Footer */}
      <footer className="relative z-10 bg-[#09090D] border-t border-white/10 py-8 px-5 sm:px-8">
        <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#8B8B98]">
          <div className="flex items-center gap-3">
            <BrandMark tone="dark" />
            <span aria-hidden="true">·</span>
            <span>Privacy-aware retail vision architecture</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => scrollToChapter(0)}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Back to top
            </button>
            <button
              type="button"
              onClick={onEnterDemo}
              className="text-white hover:text-[#A69FF4] transition-colors cursor-pointer font-medium"
            >
              Live Demo Workspace
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
