import { X } from 'lucide-react'

// Full-screen image viewer. Render <ImageLightbox src={url} onClose={...} />
// when a user clicks any thumbnail they should be able to inspect closely
// (ID images, guarantor IDs, property photos, etc).
export default function ImageLightbox({ src, onClose }) {
  if (!src) return null
  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2"
      >
        <X size={22} />
      </button>
      <img
        src={src}
        alt="Full size"
        className="max-w-full max-h-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
