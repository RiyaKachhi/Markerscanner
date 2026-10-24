import React, { useEffect, useRef } from 'react';
import type { TrackedObject } from '../lib/tracker';
import type { ResolvedPartAnchor } from '../lib/anchors';
import type { DetectedMarker } from '../lib/markers';

interface ARCanvasProps {
  width: number;
  height: number;
  trackedObject: TrackedObject | null;
  resolvedPart: ResolvedPartAnchor | null;
  markers: DetectedMarker[];
  showDebug: boolean;
  isLocked: boolean;
}

export const ARCanvas: React.FC<ARCanvasProps> = ({
  width,
  height,
  trackedObject,
  resolvedPart,
  markers,
  showDebug,
  isLocked,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw ArUco marker corners & axes if debug enabled
    if (showDebug) {
      for (const m of markers) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(m.corners[0].x, m.corners[0].y);
        for (let i = 1; i < 4; i++) {
          ctx.lineTo(m.corners[i].x, m.corners[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        // Corner dots
        const colors = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b'];
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = colors[i];
          ctx.beginPath();
          ctx.arc(m.corners[i].x, m.corners[i].y, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = '11px sans-serif';
        ctx.fillText(`ID: ${m.id}`, m.center.x - 12, m.center.y - 8);
      }
    }

    // 2. Draw Tracked Object Bounding Box
    if (trackedObject) {
      const { bbox, id, confidence, isMarker } = trackedObject;
      const primaryColor = isLocked ? '#22bb80' : '#f59e0b';

      ctx.save();
      // Draw modern corner-bracket bounding box
      const cornerLen = Math.min(24, bbox.width * 0.25);
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(bbox.x, bbox.y + cornerLen);
      ctx.lineTo(bbox.x, bbox.y);
      ctx.lineTo(bbox.x + cornerLen, bbox.y);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(bbox.x + bbox.width - cornerLen, bbox.y);
      ctx.lineTo(bbox.x + bbox.width, bbox.y);
      ctx.lineTo(bbox.x + bbox.width, bbox.y + cornerLen);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(bbox.x + bbox.width, bbox.y + bbox.height - cornerLen);
      ctx.lineTo(bbox.x + bbox.width, bbox.y + bbox.height);
      ctx.lineTo(bbox.x + bbox.width - cornerLen, bbox.y + bbox.height);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(bbox.x + cornerLen, bbox.y + bbox.height);
      ctx.lineTo(bbox.x, bbox.y + bbox.height);
      ctx.lineTo(bbox.x, bbox.y + bbox.height - cornerLen);
      ctx.stroke();

      // Floating header badge
      const tagText = `${isMarker ? 'Marker' : 'Object'} [${(confidence * 100).toFixed(0)}%] ${isLocked ? '● LOCKED' : '○ TRACKING'}`;
      ctx.font = 'bold 12px sans-serif';
      const textMetrics = ctx.measureText(tagText);
      const tagWidth = textMetrics.width + 16;
      const tagHeight = 22;
      const tagX = bbox.x;
      const tagY = Math.max(8, bbox.y - tagHeight - 6);

      ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagWidth, tagHeight, 4);
      ctx.fill();
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = primaryColor;
      ctx.fillText(tagText, tagX + 8, tagY + 15);

      if (showDebug) {
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px monospace';
        ctx.fillText(`Track #${id} hits:${trackedObject.hits}`, tagX, tagY - 4);
      }
      ctx.restore();
    }

    // 3. Draw Part Highlight (Arrow, Pulsing Ring, Callout Tag)
    if (resolvedPart) {
      const { screenX, screenY, name, anchorMode, isOffScreen, offScreenDirection } = resolvedPart;

      ctx.save();

      if (isOffScreen && offScreenDirection) {
        // Draw Edge Indicator Arrow pointing towards off-screen part
        drawEdgeIndicator(ctx, width, height, offScreenDirection, name);
      } else {
        // In-screen Part Highlight
        const now = performance.now();
        const pulse = 10 + Math.sin(now * 0.008) * 4;

        // Outer pulsing glow
        ctx.strokeStyle = 'rgba(34, 187, 128, 0.4)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(screenX, screenY, pulse + 6, 0, Math.PI * 2);
        ctx.stroke();

        // Target Ring
        ctx.strokeStyle = '#22bb80';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 10, 0, Math.PI * 2);
        ctx.stroke();

        // Center dot
        ctx.fillStyle = '#22bb80';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
        ctx.fill();

        // Animated 2D Pointer Arrow (pointing down onto part)
        const arrowY = screenY - 24 + Math.sin(now * 0.008) * 3;
        ctx.fillStyle = '#22bb80';
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - 10);
        ctx.lineTo(screenX - 7, arrowY);
        ctx.lineTo(screenX + 7, arrowY);
        ctx.closePath();
        ctx.fill();

        // Part Name Callout Label
        ctx.font = 'bold 12px sans-serif';
        const labelText = name;
        const metrics = ctx.measureText(labelText);
        const lblW = metrics.width + 16;
        const lblH = 22;
        const lblX = screenX - lblW / 2;
        const lblY = arrowY - lblH - 4;

        ctx.fillStyle = 'rgba(17, 24, 38, 0.9)';
        ctx.beginPath();
        ctx.roundRect(lblX, lblY, lblW, lblH, 6);
        ctx.fill();
        ctx.strokeStyle = '#22bb80';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, lblX + 8, lblY + 15);

        // Small badge showing anchor resolution
        if (showDebug) {
          ctx.font = '9px sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(`[${anchorMode}]`, lblX, lblY - 3);
        }
      }

      ctx.restore();
    }
  }, [width, height, trackedObject, resolvedPart, markers, showDebug, isLocked]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none z-20"
    />
  );
};

function drawEdgeIndicator(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  direction: 'top' | 'bottom' | 'left' | 'right',
  partName: string
) {
  ctx.save();
  let x = w / 2;
  let y = h / 2;
  let angle = 0;

  switch (direction) {
    case 'left':
      x = 30;
      angle = Math.PI;
      break;
    case 'right':
      x = w - 30;
      angle = 0;
      break;
    case 'top':
      y = 40;
      angle = -Math.PI / 2;
      break;
    case 'bottom':
      y = h - 60;
      angle = Math.PI / 2;
      break;
  }

  // Draw chevron pointer
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-6, -10);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-6, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Edge label pill
  ctx.font = '11px sans-serif';
  const text = `◄ ${partName}`;
  ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
  ctx.beginPath();
  ctx.roundRect(x - 40, y + 15, 80, 18, 4);
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.fillText(text, x - 34, y + 28);
}
