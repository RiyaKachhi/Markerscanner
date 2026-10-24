# LabLens Custom TF.js Model Directory

Drop your fine-tuned model files here:
- `model.json`
- `group1-shard1of1.bin` (or multiple shards)

Once placed here, update `src/config/model.config.ts`:
```ts
export const activeModelConfig: ModelConfig = {
  type: 'custom-tfjs-detector',
  modelUrl: '/models/lablens/model.json',
  ...
};
```
The app will automatically load and run inference on the camera stream.
