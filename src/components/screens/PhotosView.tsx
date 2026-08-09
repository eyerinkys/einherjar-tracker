'use client';

import React, { useState } from 'react';
import type { ProgressPhoto } from '@/types';
import { getPhotos, deletePhoto } from '@/actions/photos';
import { RunePanel } from '@/components/ui/RunePanel';
import { EmptyState } from '@/components/ui/EmptyState';
import { Camera, Columns, Check, X, Trash2 } from 'lucide-react';

// Real Photo Component for displaying uploaded images
const PhotoDisplay: React.FC<{ url: string; label: string | null; date: string }> = ({ url, label, date }) => {
  return (
    <div className="w-full h-full min-h-[220px] bg-[#161A20] border border-[#393E46] relative flex flex-col items-center justify-center p-0 group overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label || 'Progress Photo'} className="object-cover w-full h-full absolute inset-0" />
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-[#948979] bg-[#222831]/80 backdrop-blur-xs px-2 py-1 rounded-xs border border-[#393E46]">
        <span>{date}</span>
        {label && <span className="uppercase text-[#8DAA91] font-bold">{label}</span>}
      </div>
    </div>
  );
};

interface PhotosViewProps {
  initialPhotos?: ProgressPhoto[];
}

export const PhotosView: React.FC<PhotosViewProps> = ({ initialPhotos }) => {
  const [photos, setPhotos] = useState<ProgressPhoto[]>(() => initialPhotos ?? []);
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [pending, setPending] = useState(false);

  const refreshPhotos = async () => {
    const res = await getPhotos();
    if (res.ok) setPhotos(res.data);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return;
    setPending(true);
    const res = await deletePhoto({ photoId: id });
    setPending(false);
    if (res.ok) {
      if (compareIds.includes(id)) {
        setCompareIds(compareIds.filter((cid) => cid !== id));
      }
      await refreshPhotos();
    } else {
      alert(res.message || 'Failed to delete photo.');
    }
  };

  const filteredPhotos = photos.filter(
    (p) => selectedTag === 'all' || p.tag === selectedTag
  );

  const toggleSelectForCompare = (id: string) => {
    if (compareIds.includes(id)) {
      setCompareIds(compareIds.filter((item) => item !== id));
    } else {
      if (compareIds.length < 2) {
        setCompareIds([...compareIds, id]);
      } else {
        setCompareIds([compareIds[1], id]); // Replace oldest
      }
    }
  };

  const photoA = photos.find((p) => p.id === compareIds[0]);
  const photoB = photos.find((p) => p.id === compareIds[1]);

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#393E46]">
        <div>
          <h2 className="font-mono text-base font-bold text-[#DFD0B8] uppercase tracking-wider">
            PROGRESS PHOTOS GALLERY
          </h2>
          <p className="font-mono text-xs text-[#948979]">
            Private chronological physique tracking & side-by-side comparison
          </p>
        </div>

        {/* Tag Filters */}
        <div className="flex items-center gap-1.5 font-mono text-xs overflow-x-auto">
          {['all', 'front', 'side', 'back'].map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1.5 rounded-xs uppercase tracking-wider transition-all border ${
                selectedTag === tag
                  ? 'bg-[#222831] border-[#677D6A] text-[#DFD0B8] font-bold'
                  : 'bg-[#1C2128] border-[#393E46] text-[#948979] hover:border-[#4D5460]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {photos.length === 0 ? (
        <EmptyState
          title="No Progress Photos Found"
          description="Upload progress photos to visually track your body composition over time."
          icon={<Camera className="w-6 h-6 text-[#677D6A]" />}
        />
      ) : (
        <>
          {/* Comparison Mode Header Trigger */}
          <div className="bg-[#1C2128] p-4 rounded-xs border border-[#393E46] flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Columns className="w-4 h-4 text-[#8DAA91]" />
              <span className="text-[#DFD0B8] font-bold uppercase">Side-By-Side Comparison Tool</span>
              <span className="text-[#948979]">({compareIds.length} of 2 selected)</span>
            </div>

            {compareIds.length === 2 ? (
              <button
                onClick={() => setIsComparing(!isComparing)}
                className="px-4 py-2 bg-[#40534C] hover:bg-[#677D6A] text-[#DFD0B8] font-bold uppercase rounded-xs border border-[#677D6A] transition-all"
              >
                {isComparing ? 'Close Comparison View' : 'Launch Side-By-Side Comparison'}
              </button>
            ) : (
              <div className="text-[#635B50] italic">Select any two photos below to compare</div>
            )}
          </div>

          {/* Side-by-Side Comparison Overlay Modal/View */}
          {isComparing && photoA && photoB && (
            <RunePanel variant="carved" className="p-5 space-y-4 border-[#677D6A]">
              <div className="flex items-center justify-between border-b border-[#393E46] pb-3">
                <h3 className="font-mono text-sm font-bold text-[#DFD0B8] uppercase tracking-wider">
                  PHYSIQUE COMPARISON VIEW
                </h3>
                <button onClick={() => setIsComparing(false)} className="text-[#948979] hover:text-[#DFD0B8]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Photo A */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono text-[#948979]">
                    <span className="font-bold text-[#DFD0B8]">BASELINE / EARLIER</span>
                    <span>{photoA.date} ({photoA.tag})</span>
                  </div>
                  <PhotoDisplay url={photoA.url} label={photoA.tag} date={photoA.date} />
                  {photoA.notes && <p className="text-xs font-mono text-[#948979] italic">&quot;{photoA.notes}&quot;</p>}
                </div>

                {/* Photo B */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono text-[#948979]">
                    <span className="font-bold text-[#8DAA91]">LATER / CURRENT</span>
                    <span>{photoB.date} ({photoB.tag})</span>
                  </div>
                  <PhotoDisplay url={photoB.url} label={photoB.tag} date={photoB.date} />
                  {photoB.notes && <p className="text-xs font-mono text-[#948979] italic">&quot;{photoB.notes}&quot;</p>}
                </div>
              </div>
            </RunePanel>
          )}

          {/* Photo Gallery Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPhotos.map((photo) => {
              const isSelected = compareIds.includes(photo.id);
              return (
                <RunePanel key={photo.id} variant="carved" className="p-3 space-y-2 group">
                  <div className="relative">
                    <PhotoDisplay url={photo.url} label={photo.tag} date={photo.date} />

                    {/* Compare Checkbox Selection Overlay */}
                    <button
                      onClick={() => toggleSelectForCompare(photo.id)}
                      className={`absolute top-2 right-2 w-7 h-7 rounded-xs border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-[#677D6A] border-[#8DAA91] text-[#1A3636] shadow-[0_0_8px_#677D6A]'
                          : 'bg-[#222831]/80 border-[#393E46] text-[#948979] hover:border-[#DFD0B8]'
                      }`}
                      title={isSelected ? 'Deselect for comparison' : 'Select for side-by-side comparison'}
                    >
                      <Check className={`w-4 h-4 stroke-[3] ${isSelected ? 'scale-100' : 'scale-75 opacity-40'}`} />
                    </button>
                    
                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(photo.id)}
                      disabled={pending}
                      className="absolute top-2 left-2 w-7 h-7 rounded-xs border flex items-center justify-center transition-all bg-[#222831]/80 border-[#393E46] text-[#948979] hover:text-[#FF9999] hover:border-[#FF9999] disabled:opacity-50"
                      title="Delete photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {photo.notes && (
                    <p className="text-xs font-mono text-[#948979] truncate px-1" title={photo.notes}>
                      {photo.notes}
                    </p>
                  )}
                </RunePanel>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
