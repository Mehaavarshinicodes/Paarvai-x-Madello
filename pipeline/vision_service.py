"""
vision_service.py
=================
Fast inference service for PaarvAI × Madello:
Uses store-intelligence-system YOLO (yolo26n.pt) + FaceRecognizer (YuNet + SFace)
and the registered workers database (Lakshana, Tejas, Shirley, Mehaa, Rithika).
"""

import os
import sys
import base64
import time
import sqlite3
import threading
import cv2
import numpy as np
from ultralytics import YOLO

_vision_lock = threading.Lock()

# Add parent directory to sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from pipeline.face_recognizer import FaceIdentifier
from pipeline.person_classifier import PersonClassifier

DB_PATH = os.path.join(BASE_DIR, "store.db")

# Registered store workers metadata
REGISTERED_WORKERS = {
    "lakshana": {
        "id": "wrk-001",
        "name": "Lakshana",
        "role": "Hacker",
        "department": "Store Management",
        "badgeCode": "EMP-001",
        "uniformCue": "Technical Operations & System Architecture Lead",
        "status": "active"
    },
    "tejas": {
        "id": "wrk-004",
        "name": "Tejas",
        "role": "Visionary",
        "department": "Store Management",
        "badgeCode": "EMP-004",
        "uniformCue": "Store Manager & Strategic Operations Lead",
        "status": "active"
    },
    "shirley": {
        "id": "wrk-002",
        "name": "Shirley",
        "role": "Hustler",
        "department": "Checkout & Service",
        "badgeCode": "EMP-002",
        "uniformCue": "Sales, Customer Engagement & POS Lead",
        "status": "active"
    },
    "mehaa": {
        "id": "wrk-003",
        "name": "Mehaa",
        "role": "Hacker",
        "department": "Floor Operations",
        "badgeCode": "EMP-003",
        "uniformCue": "Inventory, Tech Support & Visual Merchandising",
        "status": "active"
    },
    "rithika": {
        "id": "wrk-005",
        "name": "Rithika",
        "role": "Hustler",
        "department": "Floor Operations",
        "badgeCode": "EMP-005",
        "uniformCue": "Beauty Advisor & Sales Specialist",
        "status": "active"
    }
}

class VisionEngine:
    _instance = None

    def __init__(self, yolo_path="yolo26n.pt"):
        full_yolo_path = os.path.join(BASE_DIR, yolo_path) if not os.path.isabs(yolo_path) else yolo_path
        if not os.path.exists(full_yolo_path):
            full_yolo_path = os.path.join(BASE_DIR, "yolov8n.pt")

        print(f"Loading YOLO model from: {full_yolo_path}")
        self.yolo = YOLO(full_yolo_path)

        yunet_path = os.path.join(BASE_DIR, "models", "face_detection_yunet_2023mar.onnx")
        sface_path = os.path.join(BASE_DIR, "models", "face_recognition_sface_2021dec.onnx")
        known_dir = os.path.join(BASE_DIR, "known_people")

        print("Loading YuNet & SFace Face Recognizer...")
        self.face_id = FaceIdentifier(
            yunet_model=yunet_path,
            sface_model=sface_path,
            known_dir=known_dir,
            cosine_threshold=0.40
        )
        self.classifier = PersonClassifier()
        self._last_log_times = {}
        self._init_db()
        print(f"Vision Engine initialized. Known staff enrolled: {len(self.face_id.known_database)}")

    def _init_db(self):
        try:
            conn = sqlite3.connect(DB_PATH, timeout=3.0)
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT, person_id TEXT,
                    zone TEXT, role TEXT DEFAULT 'customer',
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            conn.close()
        except Exception:
            pass

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = VisionEngine()
        return cls._instance

    @staticmethod
    def _suppress_overlapping_boxes(boxes, confs, iou_thresh=0.35):
        if len(boxes) <= 1:
            return list(zip(boxes, confs))
        order = np.argsort(confs)[::-1]
        keep = []
        for i in order:
            b1 = boxes[i]
            c1 = confs[i]
            overlap = False
            for (b2, _) in keep:
                xA = max(b1[0], b2[0])
                yA = max(b1[1], b2[1])
                xB = min(b1[2], b2[2])
                yB = min(b1[3], b2[3])
                inter = max(0, xB - xA) * max(0, yB - yA)
                if inter > 0:
                    area1 = max(1, (b1[2] - b1[0]) * (b1[3] - b1[1]))
                    area2 = max(1, (b2[2] - b2[0]) * (b2[3] - b2[1]))
                    iou = inter / float(area1 + area2 - inter)
                    io_min = inter / float(min(area1, area2))
                    if iou > iou_thresh or io_min > 0.55:
                        overlap = True
                        break
            if not overlap:
                keep.append((b1, c1))
        return keep

    def analyze_image(self, image_bgr, source="webcam"):
        height, width = image_bgr.shape[:2]
        if height == 0 or width == 0:
            return {"error": "Invalid frame dimensions"}

        with _vision_lock:
            # 1. Run YOLO person detection with high-speed 384px resolution and tight NMS (26ms latency)
            results = self.yolo(image_bgr, classes=[0], conf=0.35, iou=0.40, imgsz=384, verbose=False)

            emp_counter = 0
            anon_counter = 0
            raw_detections = []

            if results and len(results) > 0 and results[0].boxes:
                raw_boxes = results[0].boxes.xyxy.cpu().numpy()
                raw_confs = results[0].boxes.conf.cpu().numpy()

                # Filter overlapping candidate bounding boxes
                filtered = self._suppress_overlapping_boxes(raw_boxes, raw_confs, iou_thresh=0.35)

                for box, conf in filtered:
                    x1 = max(0, int(box[0]))
                    y1 = max(0, int(box[1]))
                    x2 = min(width, int(box[2]))
                    y2 = min(height, int(box[3]))

                    # Guard: minimum size
                    if (x2 - x1) < 20 or (y2 - y1) < 30:
                        continue

                    ymin = max(0.0, min(1.0, float(y1) / height))
                    xmin = max(0.0, min(1.0, float(x1) / width))
                    ymax = max(ymin + 0.04, min(1.0, float(y2) / height))
                    xmax = max(xmin + 0.03, min(1.0, float(x2) / width))

                    # Crop for face recognition
                    crop = image_bgr[y1:y2, x1:x2]
                    matched_name, pid, face_conf = self.face_id.recognize_face_in_crop(crop)

                    worker_info = None
                    if matched_name:
                        worker_info = REGISTERED_WORKERS.get(matched_name.lower())

                    if worker_info:
                        emp_counter += 1
                        track_label = f"EMP-{emp_counter:02d}"
                        category = "registered_employee"
                        worker_id = worker_info["id"]
                        worker_name = worker_info["name"]
                        worker_role = worker_info["role"]
                        zone = worker_info["department"]
                        visual_cue = f"Registered Staff: {worker_name} ({worker_info['badgeCode']}) - {worker_role}"
                        det_conf = round(min(0.99, max(0.70, float(face_conf) / 100.0)), 2)
                        privacy_masked = False

                        # Log to DB
                        self._log_event("entry", f"{worker_name} ({worker_info['badgeCode']}) [{worker_role}]", role=worker_role.lower())
                    else:
                        anon_counter += 1
                        track_label = f"ANON-{anon_counter:02d}"
                        category = "unregistered_person"
                        worker_id = None
                        worker_name = None
                        worker_role = None
                        zone = "General Floor"
                        visual_cue = "Non-registered customer (anonymous posture count, privacy masked)"
                        det_conf = round(float(conf), 2)
                        privacy_masked = True

                        # Log customer entry occasionally
                        self._log_event("entry", f"Customer #{anon_counter}", role="customer")

                    raw_detections.append({
                        "trackLabel": track_label,
                        "category": category,
                        "workerId": worker_id,
                        "workerName": worker_name,
                        "workerRole": worker_role,
                        "zone": zone,
                        "visualCue": visual_cue,
                        "confidence": det_conf,
                        "privacyMasked": privacy_masked,
                        "box": {
                            "ymin": round(ymin, 4),
                            "xmin": round(xmin, 4),
                            "ymax": round(ymax, 4),
                            "xmax": round(xmax, 4)
                        }
                    })

            # Deduplicate registered staff per frame: eliminate duplicate overlapping staff tags
            detections = []
            seen_worker_ids = set()

            # Prioritize higher confidence detections
            raw_detections.sort(
                key=lambda d: (1 if d["category"] == "registered_employee" else 0, d["confidence"]),
                reverse=True
            )

            for det in raw_detections:
                wid = det.get("workerId")
                if wid:
                    if wid in seen_worker_ids:
                        # Skip duplicate detection of the exact same staff member in the same frame
                        continue
                    seen_worker_ids.add(wid)
                detections.append(det)

            reg_count = len([d for d in detections if d["category"] == "registered_employee"])
            anon_count = len(detections) - reg_count
            zones_active = list(set([d["zone"] for d in detections])) or ["General Floor"]

            summary = f"Observed {len(detections)} people ({reg_count} registered staff, {anon_count} anonymous visitors)."

            event = {
                "id": f"evt-{int(time.time() * 1000):x}",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
                "source": source,
                "totalPeople": len(detections),
                "registeredEmployeesCount": reg_count,
                "unregisteredPeopleCount": anon_count,
                "zonesActive": zones_active,
                "summary": summary,
                "detections": detections
            }

            return {
                "event": event,
                "privacyGuarantee": "Frame discarded after inference. Zero customer facial biometrics or image frames were stored."
            }

    def _log_event(self, event_type, person_id, role="customer"):
        now = time.time()
        # High-speed throttle: avoid blocking on synchronous SQLite disk commits every frame
        if person_id in self._last_log_times and (now - self._last_log_times[person_id]) < 8.0:
            return
        self._last_log_times[person_id] = now
        try:
            conn = sqlite3.connect(DB_PATH, timeout=1.0)
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO events (event_type, person_id, zone, role, timestamp) "
                "VALUES (?, ?, ?, ?, datetime('now'))",
                (event_type, person_id, "store", role)
            )
            conn.commit()
            conn.close()
        except Exception:
            pass

engine = VisionEngine.get_instance()

def process_base64_frame(base64_str, source="webcam"):
    clean_b64 = base64_str.split(",")[-1]
    raw_bytes = base64.b64decode(clean_b64)
    nparr = np.frombuffer(raw_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Could not decode image from base64")
    return engine.analyze_image(frame, source=source)

if __name__ == "__main__":
    test_img = np.zeros((480, 640, 3), dtype=np.uint8)
    res = engine.analyze_image(test_img)
    print("Test inference successful:", res["event"]["summary"])

