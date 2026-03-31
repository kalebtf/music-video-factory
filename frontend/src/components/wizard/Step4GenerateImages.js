import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Check, X, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { AuthImage } from '../AuthImage';

const PLACEHOLDER_COLORS = ['#e94560', '#0f3460', '#f0a500', '#16213e', '#53d769', '#8b5cf6', '#00b4d8', '#ff6b35'];

export default function Step4GenerateImages({ project, updateProject, projectId }) {
  const [generating, setGenerating] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);
  const [feedbackText, setFeedbackText] = useState({});
  const [error, setError] = useState('');

  // Initialize with uploaded images if any
  useEffect(() => {
    if (project.uploadedImages.length > 0 && project.images.length === 0) {
      const uploadedAsImages = project.uploadedImages.map((img) => ({
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

    // Preserve uploaded images
    const uploadedImages = project.images.filter(img => img.isUploaded);
    
    // Create placeholder entries for new images
    const newImages = prompts.map((prompt, i) => ({
      id: `gen-${Date.now()}-${i}`,
      url: null,
      color: PLACEHOLDER_COLORS[i % PLACEHOLDER_COLORS.length],
      prompt,
      status: 'generating',
      cost: 0,
      isUploaded: false,
    }));

    const allImages = [...uploadedImages, ...newImages];
    updateProject({ images: allImages });

    // Generate images one by one
    let totalCost = 0;
    for (let i = 0; i < prompts.length; i++) {
      setGeneratingIndex(i);
      
      const imgIndex = uploadedImages.length + i;
      const imageId = allImages[imgIndex]?.id;

      try {
        const { data } = await api.post(
          '/ai/generate-image',
          {
            projectId,
            prompt: prompts[i] + (project.concept.customInstructions ? `, ${project.concept.customInstructions}` : ''),
            imageIndex: i
          }
        );

        const fullUrl = `${process.env.REACT_APP_BACKEND_URL}${data.imageUrl}`;

        // Update the specific image with the result — using function form
        updateProject(prev => {
          const updatedImages = prev.images.map(img =>
            img.id === imageId
              ? {
                  ...img,
                  url: fullUrl,
                  imagePath: data.imagePath || '',
                  status: 'pending',
                  cost: data.cost,
                }
              : img
          );
          return { images: updatedImages };
        });

        totalCost += data.cost;
      } catch (err) {
        console.error(`Failed to generate image ${i}:`, err);
        const errorMsg = err.response?.data?.detail || 'Image generation failed';
        
        // Update image to show error state
        updateProject(prev => {
          const updatedImages = prev.images.map(img =>
            img.id === imageId
              ? { ...img, status: 'error', error: errorMsg }
              : img
          );
          return { images: updatedImages };
        });
      }
    }

    // Update costs
    updateProject(prev => ({
      costs: {
        ...prev.costs,
        images: totalCost,
      }
    }));

    setGeneratingIndex(null);
    setGenerating(false);

    // Persist images to DB
    if (projectId) {
      try {
        const imagesToSave = project.images.map(img => ({
          id: img.id,
          url: img.url || '',
          prompt: img.prompt || '',
          status: img.status || 'pending',
          cost: img.cost || 0,
          isUploaded: img.isUploaded || false,
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

    // Combine original prompt with feedback
    const newPrompt = feedbackText[imageId] 
      ? `${image.prompt}, with modifications: ${feedbackText[imageId]}`
      : image.prompt;

    try {
      const { data } = await api.post(
        '/ai/generate-image',
        {
          projectId,
          prompt: newPrompt + (project.concept.customInstructions ? `, ${project.concept.customInstructions}` : ''),
          imageIndex: index
        }
      );

      const fullUrl = `${process.env.REACT_APP_BACKEND_URL}${data.imageUrl}`;

      updateProject(prev => {
        const updatedImages = prev.images.map(img =>
          img.id === imageId
            ? {
                ...img,
                url: fullUrl,
                imagePath: data.imagePath || '',
                status: 'pending',
                cost: img.cost + data.cost,
                feedback: feedbackText[imageId] || '',
              }
            : img
        );
        return {
          images: updatedImages,
          costs: {
            ...prev.costs,
            images: prev.costs.images + data.cost,
          }
        };
      });

      setFeedbackText({ ...feedbackText, [imageId]: '' });
    } catch (err) {
      console.error('Regeneration failed:', err);
      setError(err.response?.data?.detail || 'Regeneration failed. Please try again.');
    } finally {
      setRegeneratingIndex(null);
    }
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

  const approved = project.images.filter(img => img.status === 'approved').length;
  const rejected = project.images.filter(img => img.status === 'rejected').length;
  const pending = project.images.filter(img => img.status === 'pending').length;
  const generatingCount = project.images.filter(img => img.status === 'generating').length;
  const totalCost = project.images.reduce((sum, img) => sum + (img.cost || 0), 0);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl font-bold text-[#f8f8f8] mb-2">
          Generate & Approve Images
        </h2>
        <p className="text-[#8b8b99]">
          Generate images from your prompts using OpenAI GPT Image 1
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

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
                Generating {generatingIndex !== null ? `image ${generatingIndex + 1}...` : '...'}
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
          {generatingCount > 0 && (
            <span className="text-[#f59e0b]">
              <Loader2 className="w-4 h-4 inline mr-1 animate-spin" />
              {generatingCount} generating
            </span>
          )}
        </div>
      )}

      {/* Images Grid */}
      {project.images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {project.images.map((image, index) => (
            <div
              key={image.id}
              className={`bg-[#141418] border rounded-xl overflow-hidden transition-all ${
                image.status === 'approved'
                  ? 'border-[#10b981]'
                  : image.status === 'rejected'
                  ? 'border-[#ef4444]'
                  : image.status === 'generating'
                  ? 'border-[#f59e0b]'
                  : 'border-[#2a2a35]'
              }`}
              data-testid={`image-card-${index}`}
            >
              {/* Image */}
              <div className="aspect-[9/16] relative">
                {image.status === 'generating' ? (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center"
                    style={{ backgroundColor: image.color }}
                  >
                    <Loader2 className="w-12 h-12 text-white/50 animate-spin mb-2" />
                    <span className="text-white/70 text-sm">Generating...</span>
                  </div>
                ) : image.status === 'error' ? (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center p-4"
                    style={{ backgroundColor: '#1a1a2e' }}
                  >
                    <AlertCircle className="w-12 h-12 text-[#ef4444] mb-2" />
                    <span className="text-[#ef4444] text-sm text-center">{image.error || 'Generation failed'}</span>
                  </div>
                ) : image.url ? (
                  <AuthImage
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
                      data-testid={`approve-${index}`}
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(image.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#ef4444] text-white rounded-lg hover:bg-[#dc2626] transition-all text-sm"
                      data-testid={`reject-${index}`}
                    >
                      <X className="w-4 h-4" />
                      Reject
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

                {/* Cost display per image */}
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

      {/* Cost Display */}
      {project.images.length > 0 && (
        <div className="text-center text-sm text-[#8b8b99]">
          Images: {project.images.filter(img => !img.isUploaded && img.cost > 0).length} x $0.005 = 
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
