import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EyeOff,
  FileVideo,
  Play,
  RotateCcw,
  Scan,
  Upload,
  Video,
} from 'lucide-react';
import type { AnalysisEvent, DetectedPerson, VisionAnalysisResponse } from '../../types/vision';

interface VideoUploadViewProps {
  latestEvent: AnalysisEvent | null;
  onNewEvent: (event: AnalysisEvent) => void;
  visionConfigured: boolean | null;
}

const SAMPLE_STORE_VIDEO_URL = '/sample_data/WhatsApp%20Video%202026-11-12%20at%2012.30.21.mp4';

export const VideoUploadView: React.FC<VideoUploadViewProps> = ({
  latestEvent,
  onNewEvent,
  visionConfigured,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [autoScan, setAutoScan] = useState(true);
  const [privacyMaskEnabled, setPrivacyMaskEnabled] = useState(true);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeDetections, setActiveDetections] = useState<DetectedPerson[]>([]);
  const [activeSummary, setActiveSummary] = useState<string | null>(null);
  const [privacyNotice, setPrivacyNotice] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Send a captured video frame to the FastAPI vision service
  const sendFrameForAnalysis = useCallback(
    async (base64Data: string) => {
      setProcessing(true);
      setAnalysisError(null);
      try {
        const res = await fetch('/api/vision/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: 'image/jpeg',
            source: 'uploaded_video',
          }),
        });
        const data = (await res.json()) as VisionAnalysisResponse & { error?: string };
        if (!res.ok) {
          throw new Error(data.error || `Server returned status ${res.status}`);
        }
        setActiveDetections(data.event.detections);
        setActiveSummary(data.event.summary);
        setPrivacyNotice(data.privacyGuarantee);
        onNewEvent(data.event);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Video frame analysis failed.';
        setAnalysisError(msg);
      } finally {
        setProcessing(false);
      }
    },
    [onNewEvent],
  );

  // Capture current video frame and analyze it
  const captureAndAnalyzeVideoFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const origW = video.videoWidth || 640;
    const origH = video.videoHeight || 480;
    const scale = Math.min(1, 640 / Math.max(origW, origH));
    const width = Math.round(origW * scale);
    const height = Math.round(origH * scale);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
    await sendFrameForAnalysis(dataUrl);
  }, [sendFrameForAnalysis]);

  // Handle file selection from input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadVideoFile(file);
    e.target.value = '';
  };

  const loadVideoFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setVideoFileName(file.name);
    setActiveDetections([]);
    setActiveSummary(null);
    setAnalysisError(null);
  };

  const loadSampleVideo = () => {
    setVideoSrc(SAMPLE_STORE_VIDEO_URL);
    setVideoFileName('Store_CCTV_Sample.mp4');
    setActiveDetections([]);
    setActiveSummary(null);
    setAnalysisError(null);
  };

  // When video data is loaded or user scrubs, analyze that frame
  const handleLoadedData = () => {
    window.setTimeout(() => {
      void captureAndAnalyzeVideoFrame();
    }, 300);
  };

  const handleSeeked = () => {
    void captureAndAnalyzeVideoFrame();
  };

  // Periodic frame analysis while the video is playing if autoScan is enabled
  useEffect(() => {
    if (!autoScan || !videoSrc) return;

    const timer = window.setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused && !video.ended && !processing) {
        void captureAndAnalyzeVideoFrame();
      }
    }, 200);

    return () => window.clearInterval(timer);
  }, [autoScan, videoSrc, processing, captureAndAnalyzeVideoFrame]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      loadVideoFile(file);
    }
  };

  const registeredInFrame = activeDetections.filter(
    (d) => d.category === 'registered_employee',
  ).length;
  const unregisteredInFrame = activeDetections.filter(
    (d) => d.category === 'unregistered_person',
  ).length;

  return (
    <div className="space-y-6">
      {/* Header & Controls Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
            Video Upload & AI Vision Analysis
          </h1>
          <p className="text-sm text-[#8B8B98] mt-1">
            {videoSrc ? (
              <>
                Loaded: <span className="text-white font-medium">{videoFileName}</span>
                {processing && <span className="text-[#A78BFA]"> · Analysing frame...</span>}
              </>
            ) : (
              'Upload store CCTV or mobile video to run YOLO26 & Face Recognition'
            )}
            {visionConfigured === false && (
              <span className="text-[#E9E9EF]/80"> · Model key not detected</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/*"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload video file"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#5146C8] text-white rounded-md hover:bg-[#4339B4] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{videoSrc ? 'Upload Different Video' : 'Upload Video'}</span>
          </button>

          {videoSrc && (
            <>
              <button
                type="button"
                onClick={captureAndAnalyzeVideoFrame}
                disabled={processing}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium border border-[#5146C8]/60 bg-[#5146C8]/20 text-white rounded-md hover:bg-[#5146C8]/35 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Scan className="w-3.5 h-3.5 text-[#A78BFA]" aria-hidden="true" />
                <span>{processing ? 'Analysing...' : 'Analyse Current Frame'}</span>
              </button>

              <button
                type="button"
                onClick={() => setAutoScan((v) => !v)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  autoScan
                    ? 'border-[#5146C8] bg-[#5146C8]/20 text-white'
                    : 'border-white/15 text-[#E9E9EF] hover:border-white/35'
                }`}
              >
                <Play className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{autoScan ? 'Auto-Scan On' : 'Auto-Scan Off'}</span>
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

      {/* Main Viewport & Video Player */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative w-full aspect-video max-h-[68vh] bg-[#15151C] border rounded-lg overflow-hidden transition-colors ${
          isDragging ? 'border-[#5146C8] bg-[#5146C8]/10' : 'border-white/12'
        }`}
      >
        {videoSrc ? (
          <>
            <video
              ref={videoRef}
              src={videoSrc}
              controls
              playsInline
              onLoadedData={handleLoadedData}
              onSeeked={handleSeeked}
              className="w-full h-full object-contain bg-black"
            />

            {/* AI Bounding Box Overlays */}
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
                      {/* Name / Role Label Tag */}
                      <div
                        className={`absolute ${
                          placeBottom ? '-bottom-6' : '-top-6'
                        } left-0 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap rounded-xs ${
                          isEmp
                            ? 'bg-[#5146C8] text-white shadow-md'
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

                      {/* Head privacy mask for shoppers */}
                      {!isEmp && privacyMaskEnabled && det.privacyMasked && (
                        <div
                          style={{ height: '24%' }}
                          className="w-full bg-[#09090D]/90 border-b border-white/15 flex items-center justify-center"
                        >
                          <span className="text-[9px] font-mono tracking-wide text-[#8B8B98]">
                            MASKED
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* Empty / Upload State */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <div className="max-w-md space-y-4">
              <div className="w-14 h-14 rounded-full border border-white/15 bg-[#09090D] flex items-center justify-center mx-auto shadow-inner">
                <Video className="w-6 h-6 text-[#A78BFA]" aria-hidden="true" />
              </div>
              <h2 className="font-display font-semibold text-lg text-white">
                Upload Video for AI Vision Analysis
              </h2>
              <p className="text-sm text-[#8B8B98] leading-relaxed">
                Upload any store CCTV, surveillance, or smartphone video (MP4, WebM, MOV) to detect people,
                recognize registered staff (Lakshana, Tejas, Shirley, Mehaa, Rithika), and anonymize customers.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 text-xs font-semibold bg-[#5146C8] text-white rounded-md hover:bg-[#4339B4] transition-colors cursor-pointer inline-flex items-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Choose Video File</span>
                </button>
                <button
                  type="button"
                  onClick={loadSampleVideo}
                  className="px-4 py-2.5 text-xs font-medium border border-white/20 text-white rounded-md hover:border-white/45 transition-colors cursor-pointer inline-flex items-center gap-2"
                >
                  <FileVideo className="w-3.5 h-3.5 text-[#8B8B98]" aria-hidden="true" />
                  <span>Load Sample Store Video</span>
                </button>
              </div>
              <p className="text-xs text-[#8B8B98]/60 pt-2">
                Drag and drop video file anywhere in this box
              </p>
            </div>
          </div>
        )}

        <canvas ref={captureCanvasRef} className="hidden" />
      </div>

      {/* Error Banner */}
      {analysisError && (
        <div
          role="alert"
          className="p-4 rounded-md border border-white/20 bg-[#15151C] text-sm text-[#E9E9EF]"
        >
          <span className="font-semibold text-white">Vision analysis notice: </span>
          {analysisError}
        </div>
      )}

      {/* Frame Analytics Strip */}
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
              (videoSrc
                ? 'Play or seek through the video to run continuous AI detections.'
                : 'Upload a video to begin analysis.')}
          </p>
          {privacyNotice && (
            <p className="text-[11px] text-[#8B8B98] mt-2">{privacyNotice}</p>
          )}
        </div>
      </div>
    </div>
  );
};
