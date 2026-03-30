import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Check, X, RefreshCw, Loader2 } from 'lucide-react';

const PLACEHOLDER_COLORS = ['#e94560', '#0f3460', '#f0a500', '#16213e', '#53d769', '#8b5cf6', '#00b4d8', '#ff6b35'];

export default function Step4GenerateImages({ project, updateProject }) {
  const [generating, setGenerating] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);
  const [feedbackText, setFeedbackText] = useState({});

  // Initialize with uploaded images if any
  useEffect(() => {
    if (project.uploadedImages.length > 0 && project.images.length === 0) {
      const uploadedAsImages = project.uploadedImages.map((img, i) => ({
        id: img.id,
        url: img.url,
        prompt: 'User uploaded image',
        status: 'approved',
        cost: 0,
        isUploaded: true,
      }));
      updateProject({ images: uploadedAsImages });
    }
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    // Placeholder: simulate image generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    const numImages = project.concept.numImages || 3;
    const costPerImage = 0.005; // GPT Image Mini default

    const newImages = Array.from({ length: numImages }, (_, i) => ({
      id: `gen-${Date.now()}-${i}`,
      url: null, // Placeholder
      color: PLACEHOLDER_COLORS[i % PLACEHOLDER_COLORS.length],
      prompt: project.concept.prompts[i] || `Generated image ${i + 1}`,
      status: 'pending',
      cost: costPerImage,
      isUploaded: false,
    }));

    // Preserve uploaded images
    const uploadedImages = project.images.filter(img => img.isUploaded);

    updateProject({
      images: [...uploadedImages, ...newImages],
      costs: {
        ...project.costs,
        images: uploadedImages.length * 0 + newImages.length * costPerImage,
      }
    });
    setGenerating(false);
  };

  const handleApprove = (id) => {
    updateProject({
      images: project.images.map(img =>
        img.id === id ? { ...img, status: 'approved' } : img
      )
    });
  };

  const handleReject = (id) => {
    updateProject({
      images: project.images.map(img =>
        img.id === id ? { ...img, status: 'rejected' } : img
      )
    });
  };

  const handleRegenerate = async (id) => {
    setRegeneratingIndex(id);
    await new Promise(resolve => setTimeout(resolve, 2000));

    updateProject({
      images: project.images.map(img =>
        img.id === id
          ? {
              ...img,
              status: 'pending',
              color: PLACEHOLDER_COLORS[Math.floor(Math.random() * PLACEHOLDER_COLORS.length)],
              feedback: feedbackText[id] || '',
            }
          : img
      )
    });
    setFeedbackText({ ...feedbackText, [id]: '' });
    setRegeneratingIndex(null);
  };

  const approved = project.images.filter(img => img.status === 'approved').length;
  const rejected = project.images.filter(img => img.status === 'rejected').length;
  const pending = project.images.filter(img => img.status === 'pending').length;
  const totalCost = project.images.reduce((sum, img) => sum + (img.cost || 0), 0);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl font-bold text-[#f8f8f8] mb-2">
          Generate & Approve Images
        </h2>
        <p className="text-[#8b8b99]">
          Generate images from your prompts and approve the best ones
        </p>
      </div>

      {/* Generate Button */}
      {project.images.filter(img => !img.isUploaded).length === 0 && (
        <div className="flex justify-center mb-8">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-3 bg-[#e94560] text-white rounded-lg hover:bg-[#f25a74] transition-all disabled:opacity-50"
            data-testid="generate-images-button"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ImageIcon className="w-5 h-5" />
                Generate Images
              </>
            )}
          </button>
        </div>
      )}

      {/* Status Counter */}
      {project.images.length > 0 && (
        <div className="flex items-center justify-center gap-6 py-4">
          <span className="text-[#10b981]">
            <Check className="w-4 h-4 inline mr-1" />
            {approved} approved
          </span>
          <span className="text-[#ef4444]">
            <X className="w-4 h-4 inline mr-1" />
            {rejected} rejected
          </span>
          <span className="text-[#8b8b99]">
            {pending} pending
          </span>
        </div>
      )}

      {/* Images Grid */}
      {project.images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {project.images.map((image) => (
            <div
              key={image.id}
              className={`bg-[#141418] border rounded-xl overflow-hidden transition-all ${
                image.status === 'approved'
                  ? 'border-[#10b981]'
                  : image.status === 'rejected'
                  ? 'border-[#ef4444]'
                  : 'border-[#2a2a35]'
              }`}
              data-testid={`image-card-${image.id}`}
            >
              {/* Image */}
              <div className="aspect-[9/16] relative">
                {image.url ? (
                  <img
                    src={image.url}
                    alt={image.prompt}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: image.color }}
                  >
                    <ImageIcon className="w-12 h-12 text-white/30" />
                  </div>
                )}

                {/* Status Badge */}
                {image.status === 'approved' && (
                  <div className="absolute top-2 right-2 bg-[#10b981] p-1.5 rounded-full">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                {image.status === 'rejected' && (
                  <div className="absolute top-2 right-2 bg-[#ef4444] p-1.5 rounded-full">
                    <X className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              {/* Info & Actions */}
              <div className="p-4">
                <p className="text-xs font-mono text-[#8b8b99] mb-3 line-clamp-2">
                  {image.prompt}
                </p>

                {image.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(image.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#10b981] text-white rounded-lg hover:bg-[#059669] transition-all text-sm"
                      data-testid={`approve-${image.id}`}
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(image.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#ef4444] text-white rounded-lg hover:bg-[#dc2626] transition-all text-sm"
                      data-testid={`reject-${image.id}`}
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}

                {image.status === 'rejected' && !image.isUploaded && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={feedbackText[image.id] || ''}
                      onChange={(e) => setFeedbackText({ ...feedbackText, [image.id]: e.target.value })}
                      placeholder="Feedback for regeneration..."
                      className="w-full bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-3 py-2 text-sm text-[#f8f8f8] placeholder-[#8b8b99]"
                    />
                    <button
                      onClick={() => handleRegenerate(image.id)}
                      disabled={regeneratingIndex === image.id}
                      className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-[#f59e0b] text-white rounded-lg hover:bg-[#d97706] transition-all text-sm disabled:opacity-50"
                      data-testid={`regenerate-${image.id}`}
                    >
                      {regeneratingIndex === image.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Regenerate this
                    </button>
                  </div>
                )}

                {image.status === 'approved' && (
                  <button
                    onClick={() => handleReject(image.id)}
                    className="w-full text-sm text-[#8b8b99] hover:text-[#ef4444] transition-all"
                  >
                    Change to rejected
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cost Display */}
      {project.images.length > 0 && (
        <div className="text-center text-sm text-[#8b8b99]">
          Images: {project.images.filter(img => !img.isUploaded).length} × $0.005 = 
          <span className="text-[#e94560] ml-1">${totalCost.toFixed(3)}</span>
        </div>
      )}

      {/* Requirement Message */}
      {approved < 2 && project.images.length > 0 && (
        <div className="text-center text-[#f59e0b] text-sm">
          Approve at least 2 images to continue
        </div>
      )}
    </div>
  );
}
