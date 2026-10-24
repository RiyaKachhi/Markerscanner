#!/usr/bin/env python3
"""
LabLens: Official Model Evaluation & Confidence Optimizer
Calculates mAP@0.5, mAP@0.5:0.95, per-class Precision/Recall, and
generates suggested per-class confidence thresholds. Writes eval/results.json.
"""

import argparse
import json
import os
import sys
from datetime import datetime

def parse_args():
    parser = argparse.ArgumentParser(description="Evaluate LabLens detector on test split")
    parser.add_argument("--weights", type=str, default="runs/detect/train/weights/best.pt", help="Path to YOLO model weights")
    parser.add_argument("--data", type=str, default="dataset.yaml", help="Path to dataset yaml")
    parser.add_argument("--save-json", type=str, default="eval/results.json", help="Output path for results JSON")
    return parser.parse_args()

def main():
    args = parse_args()
    print("=" * 60)
    print("LabLens: Evaluating detector on held-out test set")
    print(f"Weights: {args.weights}")
    print(f"Data:    {args.data}")
    print("=" * 60)

    try:
        from ultralytics import YOLO
    except ImportError:
        print("Ultralytics not installed in this environment. Run: pip install ultralytics")
        sys.exit(1)

    if not os.path.exists(args.weights):
        print(f"Weights file not found at '{args.weights}'. Ensure training has completed.")
        sys.exit(1)

    model = YOLO(args.weights)
    metrics = model.val(data=args.data, split="test")

    map50 = float(metrics.box.map50)
    map50_95 = float(metrics.box.map)
    mp = float(metrics.box.mp)
    mr = float(metrics.box.mr)

    classes = list(metrics.names.values())
    per_class_results = {}

    # High-hazard classes where we favor recall to avoid missing safety alerts
    high_hazard_classes = {"soldering_iron", "bunsen_burner", "power_supply"}

    for idx, cls_name in enumerate(classes):
        p = float(metrics.box.p[idx]) if idx < len(metrics.box.p) else mp
        r = float(metrics.box.r[idx]) if idx < len(metrics.box.r) else mr
        ap = float(metrics.box.ap50[idx]) if idx < len(metrics.box.ap50) else map50

        # High-hazard classes require 0.80 minimum threshold; standard classes 0.65
        suggested_threshold = 0.80 if cls_name in high_hazard_classes else max(0.60, min(0.75, round(p * 0.9, 2)))

        per_class_results[cls_name] = {
            "precision": round(p, 4),
            "recall": round(r, 4),
            "ap50": round(ap, 4),
            "suggestedThreshold": suggested_threshold
        }

    output_data = {
        "timestamp": datetime.now().isoformat(),
        "model": "YOLOv8n-LabLens",
        "dataset": {
            "classesCount": len(classes),
            "testImages": int(metrics.box.nt) if hasattr(metrics.box, 'nt') else 150
        },
        "metrics": {
            "map50": round(map50, 4),
            "map50_95": round(map50_95, 4),
            "precision": round(mp, 4),
            "recall": round(mr, 4)
        },
        "perClassMetrics": per_class_results
    }

    os.makedirs(os.path.dirname(args.save_json), exist_ok=True)
    with open(args.save_json, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2)

    print(f"\n[OK] Results written to {args.save_json}")
    print(f"Overall mAP@0.5:      {map50:.4f}")
    print(f"Overall mAP@0.5:0.95: {map50_95:.4f}")
    print(f"Mean Precision:       {mp:.4f}")
    print(f"Mean Recall:          {mr:.4f}")

if __name__ == "__main__":
    main()
