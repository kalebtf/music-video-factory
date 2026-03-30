import React, { useState, useEffect } from 'react';
import { Palette, Wand2, Plus, Trash2, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Step3VisualConcept({ project, updateProject, projectId }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [hasAutoAnalyzed, setHasAutoAnalyzed] = useState(false);
  const hasTemplate = project.template !== null;
  const hasExistingConcept = project.concept.theme || project.concept.prompts.some(p => p);

  // Auto-analyze when entering step if no concept exists and no template selected
  useEffect(() => {
    if (!hasAutoAnalyzed && !hasTemplate && !hasExistingConcept && projectId && project.lyrics) {
      handleAnalyze();
      setHasAutoAnalyzed(true);
    }
  }, [projectId]);

  const handleAnalyze = async () => {
    if (!projectId) {
      setError('Please complete Step 1 first');
      return;
    }
    
    if (!project.lyrics) {
      setError('Please add lyrics in Step 1 to analyze the song');
      return;
    }

    setAnalyzing(true);
    setError('');
    
    try {
      const { data } = await axios.post(
        `${API}/ai/analyze-song`,
        { projectId },
        { withCredentials: true }
      );
      
      updateProject({
        concept: {
          ...project.concept,
          theme: data.theme || '',
          mood: data.mood || '',
          animationStyle: data.animationStyle || '',
          palette: data.palette || ['#1a1a2e', '#e94560', '#0f3460', '#f0a500'],
          prompts: data.prompts || ['', '', ''],
          hooks: data.hooks || [],
          selectedHooks: [],
        }
      });
    } catch (err) {
      console.error('AI analysis failed:', err);
      const errorMsg = err.response?.data?.detail || 'Analysis failed. Please try again or fill in manually.';
      setError(errorMsg);
    } finally {
      setAnalyzing(false);
    }
  };

  const updateConcept = (field, value) => {
    updateProject({
      concept: {
        ...project.concept,
        [field]: value,
      }
    });
  };

  const updatePrompt = (index, value) => {
    const newPrompts = [...project.concept.prompts];
    newPrompts[index] = value;
    updateConcept('prompts', newPrompts);
  };

  const addPrompt = () => {
    updateConcept('prompts', [...project.concept.prompts, '']);
  };

  const removePrompt = (index) => {
    const newPrompts = project.concept.prompts.filter((_, i) => i !== index);
    updateConcept('prompts', newPrompts);
  };

  const updateColor = (index, color) => {
    const newPalette = [...project.concept.palette];
    newPalette[index] = color;
    updateConcept('palette', newPalette);
  };

  const toggleHook = (hook) => {
    const selected = project.concept.selectedHooks || [];
    if (selected.includes(hook)) {
      updateConcept('selectedHooks', selected.filter(h => h !== hook));
    } else if (selected.length < 2) {
      updateConcept('selectedHooks', [...selected, hook]);
    }
  };

  const setNumImages = (num) => {
    updateConcept('numImages', num);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-heading text-2xl font-bold text-[#f8f8f8] mb-2">
          Visual Concept
        </h2>
        <p className="text-[#8b8b99]">
          {hasTemplate ? 'Review and customize your visual concept' : 'AI-generated visual concept based on your song'}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Analyzing State */}
      {analyzing && (
        <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-8 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#e94560] animate-spin mb-4" />
          <p className="text-[#f8f8f8] font-medium">Analyzing your song...</p>
          <p className="text-[#8b8b99] text-sm mt-1">This may take a few seconds</p>
        </div>
      )}

      {/* Analyze Button (if no concept and not analyzing) */}
      {!analyzing && !hasExistingConcept && (
        <div className="flex justify-center mb-8">
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-2 px-6 py-3 bg-[#e94560] text-white rounded-lg hover:bg-[#f25a74] transition-all disabled:opacity-50"
            data-testid="analyze-button"
          >
            <Wand2 className="w-5 h-5" />
            Analyze with AI
          </button>
        </div>
      )}

      {/* Main Content (show when not analyzing) */}
      {!analyzing && (
        <>
          {/* Theme & Mood */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#8b8b99] mb-2">Theme / Visual Style</label>
              <textarea
                value={project.concept.theme}
                onChange={(e) => updateConcept('theme', e.target.value)}
                placeholder="e.g., Urban night vibes, neon lights, rain..."
                rows={3}
                className="w-full bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-4 py-3 text-[#f8f8f8] placeholder-[#8b8b99] focus:ring-1 focus:ring-[#e94560] focus:border-[#e94560] transition-all resize-none"
                data-testid="theme-input"
              />
            </div>
            <div>
              <label className="block text-sm text-[#8b8b99] mb-2">Mood / Animation Style</label>
              <textarea
                value={project.concept.mood || project.concept.animationStyle}
                onChange={(e) => updateConcept('mood', e.target.value)}
                placeholder="e.g., Slow zoom, melancholic, dreamy transitions..."
                rows={3}
                className="w-full bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-4 py-3 text-[#f8f8f8] placeholder-[#8b8b99] focus:ring-1 focus:ring-[#e94560] focus:border-[#e94560] transition-all resize-none"
                data-testid="mood-input"
              />
            </div>
          </div>

          {/* Color Palette */}
          <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Palette className="w-5 h-5 text-[#e94560]" />
              <h3 className="font-heading font-semibold text-[#f8f8f8]">Color Palette</h3>
            </div>
            <div className="flex gap-4">
              {project.concept.palette.map((color, index) => (
                <div key={index} className="relative">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => updateColor(index, e.target.value)}
                    className="sr-only"
                    id={`color-${index}`}
                  />
                  <label
                    htmlFor={`color-${index}`}
                    className="w-16 h-16 rounded-lg cursor-pointer block border-2 border-[#2a2a35] hover:border-[#8b8b99] transition-all"
                    style={{ backgroundColor: color }}
                    data-testid={`color-picker-${index}`}
                  />
                  <span className="text-xs text-[#8b8b99] mt-1 block text-center">{color}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Image Prompts */}
          <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-[#f8f8f8]">Image Prompts</h3>
              <button
                onClick={addPrompt}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#0c0c0f] border border-[#2a2a35] text-[#f8f8f8] rounded-lg hover:bg-[#1e1e24] transition-all"
                data-testid="add-prompt-button"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            <div className="space-y-3">
              {project.concept.prompts.map((prompt, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-[#8b8b99] text-sm w-6 pt-3">{index + 1}.</span>
                  <textarea
                    value={prompt}
                    onChange={(e) => updatePrompt(index, e.target.value)}
                    placeholder="Describe the image in detail, end with ', 9:16' for vertical format"
                    rows={2}
                    className="flex-1 bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-4 py-3 text-[#f8f8f8] placeholder-[#8b8b99] focus:ring-1 focus:ring-[#e94560] focus:border-[#e94560] transition-all resize-none font-mono text-sm"
                    data-testid={`prompt-input-${index}`}
                  />
                  {project.concept.prompts.length > 1 && (
                    <button
                      onClick={() => removePrompt(index)}
                      className="p-2 text-[#8b8b99] hover:text-[#ef4444] transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Number of Images */}
          <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6">
            <h3 className="font-heading font-semibold text-[#f8f8f8] mb-4">Number of Images</h3>
            <div className="flex gap-3">
              {[2, 3, 5, 8].map((num) => (
                <button
                  key={num}
                  onClick={() => setNumImages(num)}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    project.concept.numImages === num
                      ? 'bg-[#e94560] text-white'
                      : 'bg-[#0c0c0f] border border-[#2a2a35] text-[#f8f8f8] hover:bg-[#1e1e24]'
                  }`}
                  data-testid={`num-images-${num}`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Instructions */}
          <div>
            <label className="block text-sm text-[#8b8b99] mb-2">Custom Instructions (optional)</label>
            <textarea
              value={project.concept.customInstructions || ''}
              onChange={(e) => updateConcept('customInstructions', e.target.value)}
              placeholder="e.g., anime style, add rain effects, use film grain..."
              rows={2}
              className="w-full bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-4 py-3 text-[#f8f8f8] placeholder-[#8b8b99] focus:ring-1 focus:ring-[#e94560] focus:border-[#e94560] transition-all resize-none"
              data-testid="custom-instructions-input"
            />
          </div>

          {/* Text Hooks */}
          {project.concept.hooks && project.concept.hooks.length > 0 && (
            <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6">
              <h3 className="font-heading font-semibold text-[#f8f8f8] mb-2">Text Hooks for Video</h3>
              <p className="text-sm text-[#8b8b99] mb-4">Select 1-2 hooks to overlay on your video</p>
              <div className="flex flex-wrap gap-2">
                {project.concept.hooks.map((hook, index) => {
                  const isSelected = (project.concept.selectedHooks || []).includes(hook);
                  return (
                    <button
                      key={index}
                      onClick={() => toggleHook(hook)}
                      className={`px-4 py-2 rounded-full text-sm transition-all ${
                        isSelected
                          ? 'bg-[#e94560] text-white'
                          : 'bg-[#0c0c0f] border border-[#2a2a35] text-[#f8f8f8] hover:bg-[#1e1e24]'
                      }`}
                      data-testid={`hook-${index}`}
                    >
                      "{hook}"
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Regenerate Button */}
          <div className="flex justify-center">
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center gap-2 px-4 py-2 text-[#8b8b99] hover:text-[#f8f8f8] transition-all"
              data-testid="regenerate-button"
            >
              <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
              Regenerate concept with AI
            </button>
          </div>
        </>
      )}
    </div>
  );
}
