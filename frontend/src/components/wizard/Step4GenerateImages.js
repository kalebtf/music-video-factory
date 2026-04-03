import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Check, X, RefreshCw, Loader2, AlertCircle, Upload, Star } from 'lucide-react';
import api from '../../lib/api';
import { AuthImage } from '../AuthImage';

const PLACEHOLDER_COLORS = ['#e94560', '#0f3460', '#f0a500', '#16213e', '#53d769', '#8b5cf6', '#00b4d8', '#ff6b35'];

export default function Step4GenerateImages({ project, updateProject, projectId }) {
  const [generating, setGenerating] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);
  const [feedbackText, setFeedbackText] = useState({});
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUploadImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !projectId) return;

    setUploading(true);
    setError('');

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const { data } = await api.post(
          `/projects/${projectId}/upload-image`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );

        const fullUrl = `${process.env.REACT_APP_BACKEND_URL}${data.imageUrl}`;
        const newImage = {
          id: `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          url: fullUrl,
          imagePath: data.imagePath || '',
          prompt: `Uploaded: ${file.name}`,
          status: 'approved',
          cost: 0,
          isUploaded: true,
          isReference: false,
        };

        updateProject(prev => ({
          images: [...prev.images, newImage],
        }));
      } catch (err) {
        console.error('Upload failed:', err);
        setError(`Failed to upload ${file.name}. Only PNG, JPEG, and WebP are supported.`);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleReference = (imageId) => {
    updateProject({
      images: project.images.map(img =>
        img.id === imageId ? { ...img, isReference: !img.isReference } : img
      )
    });
  };

  // Build reference description from reference images
  const getReferencePromptSuffix = () => {
    const refs = project.images.filter(img => img.isReference && img.isUploaded);
    if (refs.length === 0) return '';
    return '. Maintain visual consistency: match the character style, color palette, and artistic aesthetic of the provided reference images. Keep the same character appearance and visual tone throughout.';
  };

  const handleGenerate = async () => {
    if (!projectId) {
      setError('Project not created yet. Please go back to Step 1.');
      return;
    }

    setGenerating(true);
    setError('');

    const numImages = project.concept.numImages || 3;
    const prompts = project.concept.prompts.filter(p => p.trim()).slice(0, numImages);

    if (prompts.length === 0) {
      setError('Please add image prompts in Step 3 first.');
      setGenerating(false);
      return;
    }

    // Keep uploaded images, create placeholders for new ones
    const uploadedImages = project.images.filter(img => img.isUploaded);

    const newImages = prompts.map((prompt, i) => ({
      id: `gen-${Date.now()}-${i}`,
      url: null,
      color: PLACEHOLDER_COLORS[i % PLACEHOLDER_COLORS.length],
      prompt,
      status: 'generating',
      cost: 0,
      isUploaded: false,
      isReference: false,
    }));

    const allImages = [...uploadedImages, ...newImages];
    updateProject({ images: allImages });

    const refSuffix = getReferencePromptSuffix();
    let totalCost = 0;

    for (let i = 0; i < prompts.length; i++) {
      setGeneratingIndex(i);
      const imgIndex = uploadedImages.length + i;
      const imageId = allImages[imgIndex]?.id;

      try {
        const fullPrompt = prompts[i]
          + (project.concept.customInstructions ? `, ${project.concept.customInstructions}` : '')
          + refSuffix;

        const { data } = await api.post('/ai/generate-image', {
          projectId,
          prompt: fullPrompt,
          imageIndex: i
        });

        const fullUrl = `${process.env.REACT_APP_BACKEND_URL}${data.imageUrl}`;

        updateProject(prev => {
          const updatedImages = prev.images.map(img =>
            img.id === imageId
              ? { ...img, url: fullUrl, imagePath: data.imagePath || '', status: 'pending', cost: data.cost }
              : img
          );
          return { images: updatedImages };
        });

        totalCost += data.cost;
      } catch (err) {
        console.error(`Failed to generate image ${i}:`, err);
        let errorMsg = 'Image generation failed. Please try again.';
        const detail = err.response?.data?.detail;
        if (typeof detail === 'string') {
          if (detail.includes('API key')) errorMsg = detail;
          else if (detail.includes('fallback')) errorMsg = detail;
          else errorMsg = detail.replace(/\d{3}:?\s?/, '').trim() || errorMsg;
        }

        updateProject(prev => {
          const updatedImages = prev.images.map(img =>
            img.id === imageId ? { ...img, status: 'error', error: errorMsg } : img
          );
          return { images: updatedImages };
        });
      }
    }

    updateProject(prev => ({
      costs: { ...prev.costs, images: totalCost }
    }));

    setGeneratingIndex(null);
    setGenerating(false);

    // Persist to DB
    if (projectId) {
      try {
        const imagesToSave = project.images.map(img => ({
          id: img.id, url: img.url || '', prompt: img.prompt || '',
          status: img.status || 'pending', cost: img.cost || 0,
          isUploaded: img.isUploaded || false, isReference: img.isReference || false,
          imagePath: img.imagePath || '',
        }));
        await api.put(`/projects/${projectId}/images`, { images: imagesToSave });
      } catch (err) {
        console.error('Failed to persist images:', err);
      }
    }
  };

  const handleRegenerate = async (imageId, index) => {
    if (!projectId) return;
    setRegeneratingIndex(imageId);
    setError('');

    const image = project.images.find(img => img.id === imageId);
    if (!image) return;

    const newPrompt = feedbackText[imageId]
      ? `${image.prompt}, with modifications: ${feedbackText[imageId]}`
      : image.prompt;
    const refSuffix = getReferencePromptSuffix();

    try {
      const { data } = await api.post('/ai/generate-image', {
        projectId,
        prompt: newPrompt + (project.concept.customInstructions ? `, ${project.concept.customInstructions}` : '') + refSuffix,
        imageIndex: index
      });

      const fullUrl = `${process.env.REACT_APP_BACKEND_URL}${data.imageUrl}`;

      updateProject(prev => {
        const updatedImages = prev.images.map(img =>
          img.id === imageId
            ? { ...img, url: fullUrl, imagePath: data.imagePath || '', status: 'pending', cost: img.cost + data.cost, feedback: feedbackText[imageId] || '' }
            : img
        );
        return { images: updatedImages, costs: { ...prev.costs, images: prev.costs.images + data.cost } };
      });

      setFeedbackText({ ...feedbackText, [imageId]: '' });
    } catch (err) {
      console.error('Regeneration failed:', err);
      const detail = err.response?.data?.detail;
      let msg = 'Regeneration failed. Please try again.';
      if (typeof detail === 'string') msg = detail.replace(/\d{3}:?\s?/, '').trim() || msg;
      setError(msg);
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleApprove = (id) => {
    updateProject({ images: project.images.map(img => img.id === id ? { ...img, status: 'approved' } : img) });
  };

  const handleReject = (id) => {
    updateProject({ images: project.images.map(img => img.id === id ? { ...img, status: 'rejected' } : img) });
  };

  const handleRemove = (id) => {
    updateProject({ images: project.images.filter(img => img.id !== id) });
  };

  const approved = project.images.filter(img => img.status === 'approved').length;
  const pending = project.images.filter(img => img.status === 'pending').length;
  const generatingCount = project.images.filter(img => img.status === 'generating').length;
  const uploadedCount = project.images.filter(img => img.isUploaded).length;
  const referenceCount = project.images.filter(img => img.isReference).length;
  const totalCost = project.images.reduce((sum, img) => sum + (img.cost || 0), 0);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl font-bold text-[#f8f8f8] mb-2">Generate & Approve Images</h2>
        <p className="text-[#8b8b99]">Upload your own images or generate with AI. Mix and match both.</p>
      </div>

      {error && (
        <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-[#f8f8f8] flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#e94560]" />
            Your Images
            {uploadedCount > 0 && <span className="text-xs text-[#8b8b99] ml-1">({uploadedCount} uploaded)</span>}
          </h3>
          <input ref={fileInputRef} type="file" multiple accept=".png,.jpg,.jpeg,.webp" onChange={handleUploadImages} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !projectId}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[#0c0c0f] border border-[#2a2a35] text-[#f8f8f8] rounded-lg hover:bg-[#1e1e24] transition-all disabled:opacity-50"
            data-testid="upload-images-button"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Images
          </button>
        </div>

        {referenceCount > 0 && (
          <p className="text-xs text-[#f59e0b] mb-2">
            <Star className="w-3 h-3 inline mr-1" />
            {referenceCount} reference image(s) — AI will match this style when generating
          </p>
        )}

        {uploadedCount === 0 && (
          <p className="text-xs text-[#8b8b99]">
            Upload your own images to use in the video, or mark them as references for AI consistency
          </p>
        )}
      </div>

      {/* Generate Button */}
      {project.images.filter(img => !img.isUploaded).length === 0 && (
        <div className="flex justify-center">
          <button
            onClick={handleGenerate}
            disabled={generating || !projectId}
            className="flex items-center gap-2 px-6 py-3 bg-[#e94560] text-white rounded-lg hover:bg-[#f25a74] transition-all disabled:opacity-50"
            data-testid="generate-images-button"
          >
            {generating ? (
              <><Loader2 className="w-5 h-5 animate-spin" />Generating {generatingIndex !== null ? `${generatingIndex + 1}...` : '...'}</>
            ) : (
              <><ImageIcon className="w-5 h-5" />Generate Images {referenceCount > 0 ? '(with references)' : ''}</>
            )}
          </button>
        </div>
      )}

      {/* Status Counter */}
      {project.images.length > 0 && (
        <div className="flex items-center justify-center gap-6 py-3">
          <span className="text-[#10b981] text-sm"><Check className="w-3 h-3 inline mr-1" />{approved} approved</span>
          <span className="text-[#8b8b99] text-sm">{pending} pending</span>
          {generatingCount > 0 && <span className="text-[#f59e0b] text-sm"><Loader2 className="w-3 h-3 inline mr-1 animate-spin" />{generatingCount} generating</span>}
        </div>
      )}

      {/* Images Grid */}
      {project.images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {project.images.map((image, index) => (
            <div
              key={image.id}
              className={`bg-[#141418] border rounded-xl overflow-hidden transition-all ${
                image.status === 'approved' ? 'border-[#10b981]'
                  : image.status === 'rejected' ? 'border-[#ef4444]'
                  : image.status === 'generating' ? 'border-[#f59e0b]'
                  : 'border-[#2a2a35]'
              }`}
              data-testid={`image-card-${index}`}
            >
              <div className="aspect-[9/16] relative">
                {image.status === 'generating' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center" style={{ backgroundColor: image.color }}>
                    <Loader2 className="w-12 h-12 text-white/50 animate-spin mb-2" />
                    <span className="text-white/70 text-sm">Generating...</span>
                  </div>
                ) : image.status === 'error' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-[#1a1a2e]">
                    <AlertCircle className="w-12 h-12 text-[#ef4444] mb-2" />
                    <span className="text-[#ef4444] text-sm text-center">{image.error || 'Generation failed'}</span>
                  </div>
                ) : image.url ? (
                  <AuthImage src={image.url} alt={image.prompt} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: image.color }}>
                    <ImageIcon className="w-12 h-12 text-white/30" />
                  </div>
                )}

                {/* Badges */}
                {image.status === 'approved' && (
                  <div className="absolute top-2 right-2 bg-[#10b981] p-1.5 rounded-full"><Check className="w-4 h-4 text-white" /></div>
                )}
                {image.isUploaded && (
                  <div className="absolute top-2 left-2 bg-[#0c0c0f]/80 px-2 py-1 rounded text-[10px] text-[#8b8b99] uppercase tracking-wider">Uploaded</div>
                )}
                {image.isReference && (
                  <div className="absolute bottom-2 left-2 bg-[#f59e0b] px-2 py-1 rounded text-[10px] text-white font-medium">Reference</div>
                )}
              </div>

              <div className="p-4">
                <p className="text-xs font-mono text-[#8b8b99] mb-3 line-clamp-2">{image.prompt}</p>

                {/* Reference toggle for uploaded images */}
                {image.isUploaded && (
                  <button
                    onClick={() => toggleReference(image.id)}
                    className={`w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs mb-2 transition-all ${
                      image.isReference
                        ? 'bg-[#f59e0b] text-white'
                        : 'bg-[#0c0c0f] border border-[#2a2a35] text-[#8b8b99] hover:text-[#f8f8f8]'
                    }`}
                    data-testid={`reference-toggle-${index}`}
                  >
                    <Star className="w-3 h-3" />
                    {image.isReference ? 'Style Reference ON' : 'Use as Style Reference'}
                  </button>
                )}

                {image.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(image.id)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#10b981] text-white rounded-lg hover:bg-[#059669] transition-all text-sm" data-testid={`approve-${index}`}>
                      <Check className="w-4 h-4" />Approve
                    </button>
                    <button onClick={() => handleReject(image.id)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#ef4444] text-white rounded-lg hover:bg-[#dc2626] transition-all text-sm" data-testid={`reject-${index}`}>
                      <X className="w-4 h-4" />Reject
                    </button>
                  </div>
                )}

                {(image.status === 'rejected' || image.status === 'error') && !image.isUploaded && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={feedbackText[image.id] || ''}
                      onChange={(e) => setFeedbackText({ ...feedbackText, [image.id]: e.target.value })}
                      placeholder="Feedback for regeneration..."
                      className="w-full bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-3 py-2 text-sm text-[#f8f8f8] placeholder-[#8b8b99]"
                    />
                    <button
                      onClick={() => handleRegenerate(image.id, index)}
                      disabled={regeneratingIndex === image.id}
                      className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-[#f59e0b] text-white rounded-lg hover:bg-[#d97706] transition-all text-sm disabled:opacity-50"
                      data-testid={`regenerate-${index}`}
                    >
                      {regeneratingIndex === image.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      Regenerate
                    </button>
                  </div>
                )}

                {image.isUploaded && (
                  <button onClick={() => handleRemove(image.id)} className="w-full text-xs text-[#8b8b99] hover:text-[#ef4444] mt-1 transition-all">
                    Remove
                  </button>
                )}

                {image.status === 'approved' && !image.isUploaded && (
                  <button onClick={() => handleReject(image.id)} className="w-full text-sm text-[#8b8b99] hover:text-[#ef4444] transition-all">
                    Change to rejected
                  </button>
                )}

                {image.cost > 0 && (
                  <p className="text-xs text-[#8b8b99] mt-2 text-right">
                    Cost: <span className="text-[#e94560]">${image.cost.toFixed(3)}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {project.images.length > 0 && (
        <div className="text-center text-sm text-[#8b8b99]">
          Generated: {project.images.filter(img => !img.isUploaded && img.cost > 0).length} images |
          Uploaded: {uploadedCount} | Total cost: <span className="text-[#e94560] ml-1">${totalCost.toFixed(3)}</span>
        </div>
      )}

      {approved < 2 && project.images.length > 0 && (
        <div className="text-center text-[#f59e0b] text-sm">Approve at least 2 images to continue</div>
      )}
    </div>
  );
}
