import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  CameraOff,
  EyeOff,
  Pause,
  Play,
  Scan,
} from 'lucide-react';
import type { AnalysisEvent, DetectedPerson, VisionAnalysisResponse } from '../../types/vision';

interface WebcamDemoProps {
  latestEvent: AnalysisEvent | null;
  onNewEvent: (event: AnalysisEvent) => void;
  visionConfigured: boolean | null;
}

type CameraState = 'idle' | 'requesting' | 'active' | 'paused' | 'error';

export const WebcamDemo: React.FC<WebcamDemoProps> = ({
  latestEvent,
  onNewEvent,
  visionConfigured,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isBusyRef = useRef(false);
  const lastEventLoggedRef = useRef<number>(0);

  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [autoScan, setAutoScan] = useState(true);
  const [privacyMaskEnabled, setPrivacyMaskEnabled] = useState(true);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeDetections, setActiveDetections] = useState<DetectedPerson[]>([]);
  const [activeSummary, setActiveSummary] = useState<string | null>(null);
  const [privacyNotice, setPrivacyNotice] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    setAutoScan(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState('idle');
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    setAnalysisError(null);
    setActiveDetections([]);
    setActiveSummary(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('error');
      setCameraError(
        'This browser environment does not expose camera capture (navigator.mediaDevices). You can test the live pipeline using a sample store frame or an uploaded image below.',
      );
      return;
    }

    setCameraState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState('active');
      setAutoScan(true);
      window.setTimeout(() => {
        void captureAndAnalyzeWebcam();
      }, 400);
    } catch (err) {
      setCameraState('error');
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Grant camera access in browser settings or use the sample store frame to test vision inference.'
          : err instanceof Error
            ? `Camera unavailable: ${err.message}. You can still test the vision pipeline with a sample store frame or uploaded photo.`
            : 'Camera hardware could not be initialized.';
      setCameraError(msg);
    }
  };

  const togglePauseCamera = () => {
    if (!videoRef.current) return;
    if (cameraState === 'active') {
      videoRef.current.pause();
      setAutoScan(false);
      setCameraState('paused');
    } else if (cameraState === 'paused') {
      videoRef.current.play().catch(() => {});
      setCameraState('active');
      setAutoScan(true);
      window.setTimeout(() => {
        void captureAndAnalyzeWebcam();
      }, 400);
    }
  };

  const sendFrameForAnalysis = useCallback(
    async (
      base64Data: string,
      mimeType: string,
      source: 'webcam' | 'sample_frame' | 'uploaded_frame',
      isManual = false,
    ) => {
      if (isManual) setProcessing(true);
      setAnalysisError(null);
      try {
        const res = await fetch('/api/vision/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64Data, mimeType, source }),
        });
        const data = (await res.json()) as VisionAnalysisResponse & { error?: string };
        if (!res.ok) {
          throw new Error(data.error || `Server returned status ${res.status}`);
        }
        setActiveDetections(data.event.detections);
        setActiveSummary(data.event.summary);
        setPrivacyNotice(data.privacyGuarantee);

        // Throttle parent event logging to avoid continuous re-rendering of entire app tree
        const now = Date.now();
        if (isManual || now - lastEventLoggedRef.current > 3000) {
          lastEventLoggedRef.current = now;
          onNewEvent(data.event);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Frame analysis failed.';
        setAnalysisError(msg);
        setAutoScan(false);
      } finally {
        if (isManual) setProcessing(false);
      }
    },
    [onNewEvent],
  );

  const captureAndAnalyzeWebcam = useCallback(async (isManual = false) => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    // High-speed downscale: capped at 640px to match YOLO's native size
    // Drops payload from 450KB to ~25KB for instant transmission & inference
    const origW = video.videoWidth || 640;
    const origH = video.videoHeight || 480;
    const scale = Math.min(1, 640 / Math.max(origW, origH));
    const width = Math.round(origW * scale);
    const height = Math.round(origH * scale);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
    await sendFrameForAnalysis(dataUrl, 'image/jpeg', 'webcam', isManual);
  }, [sendFrameForAnalysis]);

  useEffect(() => {
    if (!autoScan || cameraState !== 'active') return;

    let isMounted = true;
    let timerId: number | null = null;

    const runScanLoop = async () => {
      if (!isMounted) return;
      if (!isBusyRef.current) {
        isBusyRef.current = true;
        try {
          await captureAndAnalyzeWebcam(false);
        } finally {
          isBusyRef.current = false;
        }
      }
      if (isMounted) {
        // Blazing-fast 120ms cadence (~5 FPS continuous real-time tracking)
        timerId = window.setTimeout(runScanLoop, 120);
      }
    };

    timerId = window.setTimeout(runScanLoop, 100);

    return () => {
      isMounted = false;
      if (timerId) window.clearTimeout(timerId);
    };
  }, [autoScan, cameraState, captureAndAnalyzeWebcam]);

  const statusText = processing
    ? 'Processing frame'
    : cameraState === 'active'
      ? autoScan
        ? 'Camera active · Auto-scan enabled'
        : 'Camera active'
      : cameraState === 'paused'
        ? 'Camera paused'
        : cameraState === 'requesting'
          ? 'Requesting permission'
          : cameraState === 'error'
            ? 'Camera unavailable'
            : 'Standby';

  const registeredInFrame = activeDetections.filter(
    (d) => d.category === 'registered_employee',
  ).length;
  const unregisteredInFrame = activeDetections.filter(
    (d) => d.category === 'unregistered_person',
  ).length;

  return (
    <div className="space-y-6">
      {/* Compact Header & Controls Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
            Live Vision Feed
          </h1>
          <p className="text-sm text-[#8B8B98] mt-1">
            Status: <span className="text-white font-medium">{statusText}</span>
            {visionConfigured === false && (
              <span className="text-[#E9E9EF]/80">
                {' '}
                · Model key not detected in environment secrets
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {cameraState === 'idle' || cameraState === 'error' ? (
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#5146C8] text-white rounded-md hover:bg-[#4339B4] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Camera className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Start Camera</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void captureAndAnalyzeWebcam(true)}
                disabled={processing || cameraState !== 'active'}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#5146C8] text-white rounded-md hover:bg-[#4339B4] disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Scan className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{processing ? 'Analysing...' : 'Analyse Frame'}</span>
              </button>

              <button
                type="button"
                onClick={() => setAutoScan((v) => !v)}
                disabled={cameraState !== 'active'}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  autoScan
                    ? 'border-[#5146C8] bg-[#5146C8]/20 text-white'
                    : 'border-white/15 text-[#E9E9EF] hover:border-white/35'
                }`}
              >
                <span>{autoScan ? 'Auto-Scan On' : 'Auto-Scan Off'}</span>
              </button>

              <button
                type="button"
                onClick={togglePauseCamera}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-white/15 text-[#E9E9EF] rounded-md hover:border-white/35 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {cameraState === 'paused' ? (
                  <>
                    <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Pause</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={stopStream}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-white/15 text-[#8B8B98] hover:text-white rounded-md hover:border-white/35 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <CameraOff className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Stop</span>
              </button>
            </>
          )}



          <button
            type="button"
            onClick={() => setPrivacyMaskEnabled((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              privacyMaskEnabled
                ? 'border-[#5146C8]/70 bg-[#5146C8]/15 text-white'
                : 'border-white/15 text-[#8B8B98]'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{privacyMaskEnabled ? 'Privacy Mask Active' : 'Privacy Mask Off'}</span>
          </button>
        </div>
      </div>

      {/* Central Visual Viewport */}
      <div className="relative w-full aspect-video max-h-[68vh] bg-[#15151C] border border-white/12 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover ${
            cameraState === 'active' || cameraState === 'paused' ? 'block' : 'hidden'
          }`}
        />

        {/* Detection Overlays (Only rendered from real model output) */}
        {activeDetections.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {activeDetections.map((det, idx) => {
              const isEmp = det.category === 'registered_employee';
              const topPct = det.box.ymin * 100;
              const leftPct = det.box.xmin * 100;
              const heightPct = Math.max(6, (det.box.ymax - det.box.ymin) * 100);
              const widthPct = Math.max(4, (det.box.xmax - det.box.xmin) * 100);
              const placeBottom = idx % 2 === 1 && topPct + heightPct < 88;
              const compactLabel = widthPct < 10;

              return (
                <div
                  key={det.workerName ? `staff-${det.workerName}` : `person-${idx}`}
                  style={{
                    top: `${topPct}%`,
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    height: `${heightPct}%`,
                    transition: 'top 0.25s ease-out, left 0.25s ease-out, width 0.25s ease-out, height 0.25s ease-out',
                  }}
                  className={`absolute border-2 ${
                    isEmp ? 'border-[#5146C8] z-20' : 'border-[#8B8B98] z-10'
                  }`}
                >
                  {/* Label tag staggered to avoid adjacent overlap */}
                  <div
                    className={`absolute ${
                      placeBottom ? '-bottom-6' : '-top-6'
                    } left-0 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap rounded-xs ${
                      isEmp
                        ? 'bg-[#5146C8] text-white'
                        : 'bg-[#09090D]/92 text-[#E9E9EF] border border-white/15'
                    }`}
                  >
                    {isEmp && det.workerName
                      ? compactLabel
                        ? det.workerName
                        : `${det.workerName} · ${det.workerRole ?? 'Staff'}`
                      : compactLabel
                        ? det.trackLabel
                        : `${det.trackLabel} · Non-Registered`}
                  </div>

                  {/* Privacy Mask over upper head region for unregistered people */}
                  {!isEmp && privacyMaskEnabled && det.privacyMasked && (
                    <div
                      style={{ height: '24%' }}
                      className="w-full bg-[#09090D]/90 border-b border-white/15 flex items-center justify-center"
                    >
                      <span className="text-[9px] font-mono-tabular tracking-wide text-[#8B8B98]">
                        MASKED
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Idle / Error Empty Viewport */}
        {cameraState !== 'active' && cameraState !== 'paused' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <div className="max-w-md space-y-4">
              <div className="w-12 h-12 rounded-md border border-white/15 bg-[#09090D] flex items-center justify-center mx-auto">
                <Camera className="w-5 h-5 text-[#8B8B98]" aria-hidden="true" />
              </div>
              <h2 className="font-display font-semibold text-lg text-white">
                {cameraState === 'error'
                  ? 'Camera permission or device unavailable'
                  : 'Ready for live webcam analysis'}
              </h2>
              <p className="text-sm text-[#8B8B98] leading-relaxed">
                {cameraError ??
                  'Start your webcam to evaluate live frames in real-time with YOLO26 and face recognition.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 text-xs font-semibold bg-[#5146C8] text-white rounded-md hover:bg-[#4339B4] transition-colors cursor-pointer"
                >
                  Start Camera
                </button>
              </div>
            </div>
          </div>
        )}

        <canvas ref={captureCanvasRef} className="hidden" />
      </div>

      {/* Error Banner (Honest reporting when model or network fails) */}
      {analysisError && (
        <div
          role="alert"
          className="p-4 rounded-md border border-white/20 bg-[#15151C] text-sm text-[#E9E9EF]"
        >
          <span className="font-semibold text-white">Vision analysis notice: </span>
          {analysisError}
        </div>
      )}

      {/* Concise Frame Result Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-white/10 pt-5">
        <div className="p-4 rounded-md bg-[#15151C] border border-white/10">
          <div className="text-xs text-[#8B8B98] mb-1">Registered Staff in Frame</div>
          <div className="text-2xl font-display font-bold text-white tabular-nums">
            {activeDetections.length > 0 ? registeredInFrame : latestEvent?.registeredEmployeesCount ?? 0}
          </div>
        </div>
        <div className="p-4 rounded-md bg-[#15151C] border border-white/10">
          <div className="text-xs text-[#8B8B98] mb-1">Anonymous / Non-Registered</div>
          <div className="text-2xl font-display font-bold text-white tabular-nums">
            {activeDetections.length > 0 ? unregisteredInFrame : latestEvent?.unregisteredPeopleCount ?? 0}
          </div>
        </div>
        <div className="md:col-span-2 p-4 rounded-md bg-[#15151C] border border-white/10 flex flex-col justify-between">
          <div className="text-xs text-[#8B8B98] mb-1">Latest Observation</div>
          <p className="text-sm text-[#E9E9EF] leading-snug">
            {activeSummary ??
              latestEvent?.summary ??
              'No frames have been analysed in this session yet.'}
          </p>
          {privacyNotice && (
            <p className="text-[11px] text-[#8B8B98] mt-2">{privacyNotice}</p>
          )}
        </div>
      </div>
    </div>
  );
};
