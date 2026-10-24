#!/usr/bin/env bash
# ==============================================================================
# LabLens: YOLOv8n to TensorFlow.js Model Exporter
# ==============================================================================

set -e

WEIGHTS_PATH="${1:-runs/detect/train/weights/best.pt}"
OUTPUT_DIR="${2:-../public/models/lablens}"

echo "=================================================="
echo "Exporting YOLOv8n weights: $WEIGHTS_PATH"
echo "Target directory: $OUTPUT_DIR"
echo "=================================================="

# 1. Ensure ultralytics and tensorflow are installed
pip install -q ultralytics tensorflow tensorflowjs

# 2. Export model to TF.js format
yolo export model="$WEIGHTS_PATH" format=tfjs imgsz=640

# 3. Create destination directory and copy files
mkdir -p "$OUTPUT_DIR"
cp -r runs/detect/train/weights/best_web_model/* "$OUTPUT_DIR/"

echo "Successfully exported LabLens detector to $OUTPUT_DIR"
echo "Switch activeModelConfig in src/config/model.config.ts to 'custom-tfjs-detector'"
