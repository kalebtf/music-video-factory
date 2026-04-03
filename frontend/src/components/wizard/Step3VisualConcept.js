import React, { useState, useEffect, useRef } from 'react';
import { Palette, Wand2, Plus, Trash2, RefreshCw, Loader2, AlertCircle, Users, Eye, EyeOff, Mountain } from 'lucide-react';
import api from '../../lib/api';

const CHARACTER_MODES = [
  { id: 'visible', label: 'Real visible characters', icon: Users, description: 'Characters shown clearly, facing camera', promptPrefix: 'with clearly visible characters facing the camera' },
  { id: 'none', label: 'No characters', icon: EyeOff, description: 'Abstract, environment only', promptPrefix: 'with no people or characters, focus on environment and abstract visuals' },
  { id: 'far', label: 'Far away / small', icon: Mountain, description: 'Characters small in frame', promptPrefix: 'with distant small silhouette figures far away in the landscape' },
  { id: 'blurred', label: 'Blurred / obscured', icon: Eye, description: 'Characters out of focus', promptPrefix: 'with blurred obscured human silhouettes, out of focus, mysterious' },
  { id: 'behind', label: 'From behind / hidden', icon: Users, description: 'Face never shown', promptPrefix: 'with characters seen from behind, face hidden, mysterious atmosphere' },
  { id: 'environment', label: 'Environment only', icon: Mountain, description: 'Landscapes, objects, no humans', promptPrefix: 'with only landscapes, objects, and atmospheric environments, no humans' },
];

export default function Step3VisualConcept({ project, updateProject, projectId }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const hasAnalyzedRef = useRef(false);
  
  // Check if we have content (either from template or previous analysis)
  const hasContent = project.concept.theme || 
                     project.concept.mood || 
                     project.concept.prompts.some(p => p && p.trim());

  // Auto-fill from template OR auto-analyze on first render
  useEffect(() => {
    if (hasAnalyzedRef.current) return;
    hasAnalyzedRef.current = true;

    // If template was selected, populate from template
    if (project.template) {
      const template = project.template;
      updateProject({
        concept: {
          ...project.concept,
          theme: template.visualStyle || project.concept.theme || '',
          mood: template.animationStyle || project.concept.mood || '',
          palette: template.colorPalette || project.concept.palette || ['#1a1a2e', '#e94560', '#0f3460', '#f0a500'],
          prompts: template.imagePrompts || project.concept.prompts || ['', '', ''],
          hooks: template.textHooks || project.concept.hooks || [],
          selectedHooks: [],
          numImages: template.imagePrompts?.length || project.concept.numImages || 3,
        }
      });
    } 
    // If no template and no content, auto-trigger AI analysis
    else if (!hasContent && projectId && project.lyrics) {
      handleAnalyze();
    }
  }, []);

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
      // If user uploaded images, analyze them first for visual context
      if (project.imageDataUris && project.imageDataUris.length > 0) {
        try {
          await api.post('/ai/analyze-images', {
            projectId,
            imageUrls: project.imageDataUris
          });
        } catch (imgErr) {
          console.error('Image analysis failed (non-blocking):', imgErr);
        }
      }
      
      const { data } = await api.post(
        '/ai/analyze-song',
        { projectId }
      );
      
      updateProject({
        concept: {
          ...project.concept,
          theme: data.theme || '',
          mood: data.mood || data.animationStyle || '',
          animationStyle: data.animationStyle || '',
          palette: data.palette || ['#1a1a2e', '#e94560', '#0f3460', '#f0a500'],
          prompts: data.prompts || ['', '', ''],
          hooks: data.hooks || [],
          selectedHooks: [],
          numImages: data.prompts?.length || 3,
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
    } else {
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
          {project.template 
            ? `Using "${project.template.name}" template - customize as needed` 
            : 'AI-generated visual concept based on your song'}
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

      {/* Analyze Button (show prominently if no content) */}
      {!analyzing && !hasContent && (
        <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-8 flex flex-col items-center justify-center">
          <Wand2 className="w-12 h-12 text-[#e94560] mb-4" />
          <h3 className="font-heading text-lg font-semibold text-[#f8f8f8] mb-2">
            Generate Visual Concept with AI
          </h3>
          <p className="text-[#8b8b99] text-center mb-4 max-w-md">
            Based on your song title, genre, and lyrics, AI will suggest a visual theme, mood, 
            color palette, and image prompts for your music video.
          </p>
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !project.lyrics}
            className="flex items-center gap-2 px-6 py-3 bg-[#e94560] text-white rounded-lg hover:bg-[#f25a74] transition-all disabled:opacity-50"
            data-testid="analyze-button"
          >
            <Wand2 className="w-5 h-5" />
            Analyze with AI
          </button>
          {!project.lyrics && (
            <p className="text-[#f59e0b] text-sm mt-2">Please add lyrics in Step 1 first</p>
          )}
        </div>
      )}

      {/* Main Content (show when not analyzing AND we have content) */}
      {!analyzing && hasContent && (
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
              <p className="text-xs text-[#8b8b99] mt-1">
                The visual world of your video (e.g., rainy city, desert sunset)
              </p>
            </div>
            <div>
              <label className="block text-sm text-[#8b8b99] mb-2">Mood / Animation Style</label>
              <textarea
                value={project.concept.mood || project.concept.animationStyle || ''}
                onChange={(e) => updateConcept('mood', e.target.value)}
                placeholder="e.g., Slow zoom, melancholic, dreamy transitions..."
                rows={3}
                className="w-full bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-4 py-3 text-[#f8f8f8] placeholder-[#8b8b99] focus:ring-1 focus:ring-[#e94560] focus:border-[#e94560] transition-all resize-none"
                data-testid="mood-input"
              />
              <p className="text-xs text-[#8b8b99] mt-1">
                How images should animate and feel (e.g., slow zoom, gentle drift)
              </p>
            </div>
          </div>

          {/* Color Palette */}
          <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-[#e94560]" />
              <h3 className="font-heading font-semibold text-[#f8f8f8]">Character Presence</h3>
            </div>
            <p className="text-xs text-[#8b8b99] mb-4">
              How should characters appear in the generated images? This affects all AI image prompts.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {CHARACTER_MODES.map((mode) => {
                const isSelected = (project.concept.characterMode || 'visible') === mode.id;
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    onClick={() => updateConcept('characterMode', mode.id)}
                    className={`flex flex-col items-start gap-2 p-4 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-[#e94560] bg-[#e94560]/10'
                        : 'border-[#2a2a35] hover:border-[#8b8b99] bg-[#0c0c0f]'
                    }`}
                    data-testid={`character-mode-${mode.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-[#e94560]' : 'text-[#8b8b99]'}`} />
                      <span className={`text-sm font-medium ${isSelected ? 'text-[#f8f8f8]' : 'text-[#8b8b99]'}`}>
                        {mode.label}
                      </span>
                    </div>
                    <span className="text-xs text-[#8b8b99]">{mode.description}</span>
                  </button>
                );
              })}
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
            <div className="flex items-center justify-between mb-2">
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
            <p className="text-xs text-[#8b8b99] mb-4">
              Detailed description of each image to generate. Be specific about lighting, angle, atmosphere.
            </p>
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
            <h3 className="font-heading font-semibold text-[#f8f8f8] mb-4">Number of Images to Generate</h3>
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
              placeholder="e.g., anime style, add rain effects, use film grain, neon colors..."
              rows={2}
              className="w-full bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-4 py-3 text-[#f8f8f8] placeholder-[#8b8b99] focus:ring-1 focus:ring-[#e94560] focus:border-[#e94560] transition-all resize-none"
              data-testid="custom-instructions-input"
            />
            <p className="text-xs text-[#8b8b99] mt-1">
              Extra style or effects to apply to ALL images (e.g., anime style, film grain)
            </p>
          </div>

          {/* Text Hooks */}
          {project.concept.hooks && project.concept.hooks.length > 0 && (
            <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-6">
              <h3 className="font-heading font-semibold text-[#f8f8f8] mb-2">Text Hooks for Video</h3>
              <p className="text-sm text-[#8b8b99] mb-4">
                Select hooks to overlay on your video — they will cycle throughout the clip
              </p>
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
              {/* Custom hook input */}
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Add your own hook (Spanish preferred)..."
                  className="flex-1 bg-[#0c0c0f] border border-[#2a2a35] rounded-lg px-4 py-2 text-sm text-[#f8f8f8] placeholder-[#8b8b99] focus:ring-1 focus:ring-[#e94560] focus:border-[#e94560] transition-all"
                  data-testid="custom-hook-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      const newHook = e.target.value.trim();
                      const currentHooks = project.concept.hooks || [];
                      const currentSelected = project.concept.selectedHooks || [];
                      if (!currentHooks.includes(newHook)) {
                        updateConcept('hooks', [...currentHooks, newHook]);
                        updateConcept('selectedHooks', [...currentSelected, newHook]);
                      }
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.querySelector('[data-testid="custom-hook-input"]');
                    if (input && input.value.trim()) {
                      const newHook = input.value.trim();
                      const currentHooks = project.concept.hooks || [];
                      const currentSelected = project.concept.selectedHooks || [];
                      if (!currentHooks.includes(newHook)) {
                        updateConcept('hooks', [...currentHooks, newHook]);
                        updateConcept('selectedHooks', [...currentSelected, newHook]);
                      }
                      input.value = '';
                    }
                  }}
                  className="px-4 py-2 bg-[#e94560] text-white rounded-lg text-sm hover:bg-[#f25a74] transition-all"
                  data-testid="add-custom-hook-button"
                >
                  Add
                </button>
              </div>
              {(project.concept.selectedHooks || []).length > 0 && (
                <p className="text-xs text-[#10b981] mt-3">
                  {(project.concept.selectedHooks || []).length} hook(s) selected — will appear as text overlay in the final video
                </p>
              )}
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
