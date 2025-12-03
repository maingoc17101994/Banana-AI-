export enum TaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  DONE = 'DONE',
  ERROR = 'ERROR'
}

export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT = '3:4',
  LANDSCAPE = '4:3',
  WIDE = '16:9',
  TALL = '9:16'
}

export enum AIModel {
  NANO_BANANA = 'gemini-2.5-flash-image', // Mapped to Flash Image
  NANO_BANANA_PRO = 'gemini-3-pro-image-preview' // Mapped to Pro Image
}

export interface Task {
  id: string;
  selected: boolean;
  refImage: string | null; // Base64 string
  prompt: string;
  baseModel: AIModel;
  ratio: AspectRatio;
  status: TaskStatus;
  batchSize: number;
  outputImages: string[]; // List of Base64 strings or URLs
  errorMessage?: string;
}

export interface GenerationConfig {
  globalSuffix: string;
}