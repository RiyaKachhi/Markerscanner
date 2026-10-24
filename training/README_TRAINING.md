# LabLens Model Training & Evaluation Pipeline

This directory provides the end-to-end pipeline for training, evaluating, and deploying custom object detection models for **LabLens: AR Laboratory Equipment Guide** (Tech Elevate 2026).

---

## 1. Data Collection Guidelines

To achieve high mAP and robust tracking in real laboratories:
1. **Quantity:** Minimum **200 images per equipment class** across diverse angles.
2. **Varied Conditions:**
   - **Lighting:** Fluorescent lab tubes, daylight windows, low light, and direct benchtop glare.
   - **Distances:** Close-up on dials/jacks (0.3m), mid-range (0.8m), and benchtop overview (1.5m).
   - **Occlusions:** Hands operating knobs, probe leads dangling across the instrument, and test clips attached.
3. **Data Splitting (CRITICAL):**
   - Split dataset **70% train / 20% validation / 10% test**.
   - **Split by scene/session, NEVER by random frame.** Splitting consecutive video frames randomly leaks near-identical frames between train and test, producing fake high mAP numbers that collapse on unseen instruments.

---

## 2. Labelling with Roboflow or LabelImg

1. Export bounding boxes in **YOLO format** (`class_id x_center y_center width height` normalized 0..1).
2. Use standard class labels mapped in `class_map.json`:
   - `multimeter`, `caliper`, `micrometer`, `oscilloscope`, `function_generator`, `power_supply`, `breadboard`, `soldering_iron`, `arduino`, `raspberry_pi`, `bunsen_burner`, `beaker`, `weighing_scale`, `tachometer`, `safety_gear`.

---

## 3. Training with YOLOv8n (`train.ipynb`)

1. Open `train.ipynb` in [Google Colab](https://colab.research.google.com/).
2. Select a GPU runtime (T4 or A100).
3. Run the cells to fine-tune **YOLOv8n (Ultralytics)** on your dataset:
   - Augmentation: mosaic, mixup, random hue/saturation/value, brightness, and horizontal flips.
   - Hyperparameters: `epochs=100`, `imgsz=640`, `batch=16`, `lr0=0.01`.

---

## 4. Model Export to TF.js

Run `export_tfjs.sh` or execute the export cell in `train.ipynb`:
```bash
yolo export model=runs/detect/train/weights/best.pt format=tfjs imgsz=640
```
Copy the generated files (`model.json` and binary shards `group1-shard*.bin`) into:
```
public/models/lablens/
```

Then switch `src/config/model.config.ts`:
```ts
export const activeModelConfig: ModelConfig = {
  type: 'custom-tfjs-detector', // Enabled!
  modelUrl: '/models/lablens/model.json',
  ...
};
```

---

## 5. Evaluation and Threshold Optimization (`eval/evaluate.py`)

Run `evaluate.py` on your held-out test set:
```bash
python eval/evaluate.py --weights runs/detect/train/weights/best.pt --data dataset.yaml --save-json eval/results.json
```

Outputs written to `eval/results.json`:
- `mAP@0.5` and `mAP@0.5:0.95`
- Per-class Precision, Recall, and Average Precision
- Confusion Matrix (`confusion_matrix.png`)
- **Suggested per-class confidence thresholds** derived from the PR curve (biasing high recall for high-hazard classes like Bunsen Burner & Soldering Iron, while enforcing high precision for auto-locking).

---

## 6. Real Latency Benchmarking

Open `training/latency_benchmark.html` or navigate to the **Model Report** page in the LabLens PWA on target smartphone devices (iPhone Safari, Android Chrome, Laptop webcam) to log measured inference milliseconds and FPS.
