import { ProgressPhoto } from '@/types';

export const MOCK_PROGRESS_PHOTOS: ProgressPhoto[] = [
  {
    id: 'photo-1',
    date: '2026-07-01',
    tag: 'front',
    notes: 'Baseline check at start of cycle',
    aspectRatio: '3/4',
    svgPlaceholderType: 'front',
  },
  {
    id: 'photo-2',
    date: '2026-07-15',
    tag: 'side',
    notes: 'Mid-month lateral profile',
    aspectRatio: '3/4',
    svgPlaceholderType: 'side',
  },
  {
    id: 'photo-3',
    date: '2026-07-15',
    tag: 'front',
    notes: 'Week 2 front relaxed',
    aspectRatio: '3/4',
    svgPlaceholderType: 'front',
  },
  {
    id: 'photo-4',
    date: '2026-08-01',
    tag: 'back',
    notes: 'Lat width progression',
    aspectRatio: '3/4',
    svgPlaceholderType: 'back',
  },
  {
    id: 'photo-5',
    date: '2026-08-07',
    tag: 'front',
    notes: 'Current condition — end of 5 week block',
    aspectRatio: '3/4',
    svgPlaceholderType: 'front',
  },
];
