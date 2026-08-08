export type PhotoTag = 'front' | 'side' | 'back';

export interface ProgressPhoto {
  id: string;
  date: string;
  tag: PhotoTag;
  notes?: string;
  aspectRatio: string;
  svgPlaceholderType: PhotoTag;
  storageKey?: string;
}
