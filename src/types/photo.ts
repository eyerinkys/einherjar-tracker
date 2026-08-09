export type PhotoTag = 'front' | 'side' | 'back';

export interface ProgressPhoto {
  id: string;
  date: string;
  tag: PhotoTag | null;
  notes?: string;
  storageKey: string;
  mimeType: string;
  byteSize: number;
  width: number;
  height: number;
  createdAt: string;
  url: string;
}

export interface PresignResponse {
  photoId: string;
  storageKey: string;
  uploadUrl: string;
}

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
}
