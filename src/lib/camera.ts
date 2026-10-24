export interface CameraCapabilities {
  hasTorch: boolean;
  canSwitchCamera: boolean;
  facingMode: 'environment' | 'user';
  devicesCount: number;
}

export class CameraService {
  private stream: MediaStream | null = null;
  private currentFacingMode: 'environment' | 'user' = 'environment';
  private torchActive = false;
  private videoTrack: MediaStreamTrack | null = null;

  /**
   * Starts the camera stream on the specified video element
   */
  public async startCamera(
    videoElement: HTMLVideoElement,
    preferredFacingMode: 'environment' | 'user' = 'environment'
  ): Promise<CameraCapabilities> {
    this.stopCamera();

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        facingMode: { ideal: preferredFacingMode },
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
      },
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoElement.srcObject = this.stream;
      await videoElement.play();

      this.videoTrack = this.stream.getVideoTracks()[0] || null;
      this.currentFacingMode = preferredFacingMode;

      return await this.getCapabilities();
    } catch (err: unknown) {
      console.warn('Failed with ideal constraints, trying fallback getUserMedia:', err);
      // Fallback with minimal constraints
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        videoElement.srcObject = this.stream;
        await videoElement.play();
        this.videoTrack = this.stream.getVideoTracks()[0] || null;
        return await this.getCapabilities();
      } catch (fallbackErr) {
        throw this.normalizeCameraError(fallbackErr);
      }
    }
  }

  /**
   * Toggles the torch / flashlight if supported
   */
  public async toggleTorch(): Promise<boolean> {
    if (!this.videoTrack) return false;

    try {
      const capabilities = this.videoTrack.getCapabilities() as unknown as { torch?: boolean };
      if (!capabilities?.torch) {
        console.warn('Torch is not supported on this device/camera');
        return false;
      }

      this.torchActive = !this.torchActive;
      await (this.videoTrack.applyConstraints as unknown as (c: unknown) => Promise<void>)({
        advanced: [{ torch: this.torchActive }],
      });
      return this.torchActive;
    } catch (err) {
      console.error('Failed to toggle torch:', err);
      this.torchActive = false;
      return false;
    }
  }

  /**
   * Switches between environment (rear) and user (selfie) cameras
   */
  public async switchCamera(videoElement: HTMLVideoElement): Promise<CameraCapabilities> {
    const nextMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
    return await this.startCamera(videoElement, nextMode);
  }

  /**
   * Freezes a frame into an ImageData object for glare-free inspection
   */
  public captureFrozenFrame(videoElement: HTMLVideoElement): ImageData | null {
    if (!videoElement || videoElement.videoWidth === 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(videoElement, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  /**
   * Query device capabilities
   */
  public async getCapabilities(): Promise<CameraCapabilities> {
    let hasTorch = false;
    let devicesCount = 1;

    try {
      if (this.videoTrack) {
        const caps = this.videoTrack.getCapabilities() as unknown as { torch?: boolean };
        hasTorch = !!caps?.torch;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      devicesCount = videoDevices.length;
    } catch {
      // Ignore enumeration errors
    }

    return {
      hasTorch,
      canSwitchCamera: devicesCount > 1,
      facingMode: this.currentFacingMode,
      devicesCount,
    };
  }

  /**
   * Stops the camera and frees hardware resources
   */
  public stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
      this.videoTrack = null;
      this.torchActive = false;
    }
  }

  private normalizeCameraError(err: unknown): Error {
    if (err instanceof DOMException) {
      switch (err.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          return new Error('Camera permission denied. Please allow camera access in your browser settings.');
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          return new Error('No camera found on this device.');
        case 'NotReadableError':
        case 'TrackStartError':
          return new Error('Camera is currently in use by another application.');
        default:
          return new Error(`Camera error: ${err.message}`);
      }
    }
    return err instanceof Error ? err : new Error('Failed to access camera.');
  }
}

export const cameraService = new CameraService();
