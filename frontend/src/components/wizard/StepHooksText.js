import React, { useState } from 'react';
import { Type, Plus, Trash2, Wand2, Loader2, Sparkles } from 'lucide-react';
import api from '../../lib/api';

export default function StepHooksText({ project, updateProject, projectId }) {
  const [customHook, setCustomHook] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const hooks = project.concept.hooks || [];
  const selectedHooks = project.concept.selectedHooks || [];

  const updateConcept = (key, value) => {
    updateProject({ concept: { ...project.concept, [key]: value } });
  };

  const addCustomHook = () => {
    if (!customHook.trim()) return;
    const newHooks = [...hooks, customHook.trim()];
    const newSelected = [...selectedHooks, customHook.trim()];
    updateConcept('hooks', newHooks);
    updateProject({ concept: { ...project.concept, hooks: newHooks, selectedHooks: newSelected } });
    setCustomHook('');
  };

  const toggleHook = (hook) => {
    if (selectedHooks.includes(hook)) {
      updateConcept('selectedHooks', selectedHooks.filter(h => h !== hook));
    } else {
      updateConcept('selectedHooks', [...selectedHooks, hook]);
    }
  };

  const removeHook = (hook) => {
    updateProject({
      concept: {
        ...project.concept,
        hooks: hooks.filter(h => h !== hook),
        selectedHooks: selectedHooks.filter(h => h !== hook),
      }
    });
  };

  const generateHooksFromLyrics = async () => {
    if (!project.lyrics?.trim()) {
      setError('Add lyrics in Step 1 first to generate hook suggestions.');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      // Use the same analyze-song endpoint but only extract hooks
      const { data } = await api.post(`/ai/analyze-song`, {
        projectId,
        lyrics: project.lyrics,
        genre: project.genre,
        title: project.title,
      });

      // Response from /ai/analyze-song returns concept directly (not nested under .concept)
      const responseHooks = data.hooks || data.concept?.hooks || [];
      if (responseHooks.length > 0) {
        const newHooks = [...new Set([...hooks, ...responseHooks])];
        updateProject({
          concept: {
            ...project.concept,
            hooks: newHooks,
          }
        });
      } else {
        setError('AI returned no hooks. Try adding more lyrics or check your OpenAI key.');
      }
    } catch (err) {
      console.error('Hook generation failed:', err);
      setError('Failed to generate hooks. Make sure your OpenAI key is configured in Settings.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="font-heading text-2xl font-bold text-[#f8f8f8] mb-2">Hooks & Text Overlay</h2>
        <p className="text-[#8b8b99]">Add text hooks to appear over your video. Leave empty for no text overlay.</p>
      </div>

      {error && (
        <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* AI Hook Suggestions */}
      <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#00b4d8]" />
            <h3 className="font-heading font-semibold text-[#f8f8f8]">AI Hook Suggestions</h3>
          </div>
          <button
            onClick={generateHooksFromLyrics}
            disabled={generating || !project.lyrics?.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-[#00b4d8] text-white rounded-lg hover:bg-[#0096b7] text-sm disabled:opacity-50 transition-all"
            data-testid="generate-hooks-ai"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {generating ? 'Generating...' : 'Generate from Lyrics'}
          </button>
        </div>
        <p className="text-xs text-[#8b8b99] mb-4">
          Uses AI to suggest emotional text hooks based on your lyrics. Requires OpenAI key in Settings.
        </p>

        {/* Hook List */}
        {hooks.length > 0 ? (
          <div className="space-y-2">
            {hooks.map((hook, i) => {
              const isSelected = selectedHooks.includes(hook);
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-[#00b4d8]/10 border-[#00b4d8]/40'
                      : 'bg-[#0c0c0f] border-[#2a2a35]'
                  }`}
                >
                  <button
                    onClick={() => toggleHook(hook)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected ? 'bg-[#00b4d8] border-[#00b4d8]' : 'border-[#8b8b99]'
                    }`}
                    data-testid={`toggle-hook-${i}`}
                  >
                    {isSelected && <span className="text-white text-xs">&#10003;</span>}
                  </button>
                  <span className={`flex-1 text-sm ${isSelected ? 'text-[#f8f8f8]' : 'text-[#8b8b99]'}`}>
                    "{hook}"
                  </span>
                  <button
                    onClick={() => removeHook(hook)}
                    className="p-1 text-[#8b8b99] hover:text-[#ef4444] transition-all"
                    data-testid={`remove-hook-${i}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            <p className="text-xs text-[#8b8b99] mt-2">
              {selectedHooks.length} hook(s) selected — these will cycle throughout the video.
              {selectedHooks.length === 0 && ' No hooks selected = no text overlay.'}
            </p>
          </div>
        ) : (
          <p className="text-sm text-[#8b8b99] py-4 text-center">
            No hooks yet. Generate from lyrics or add manually below.
          </p>
        )}
      </div>

      {/* Manual Hook Entry */}
      <div className="bg-[#141418] border border-[#2a2a35] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Type className="w-5 h-5 text-[#00b4d8]" />
          <h3 className="font-heading font-semibold text-[#f8f8f8]">Add Custom Hook</h3>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a hook (e.g. 'Sin ti no soy nada')"
            value={customHook}
            onChange={(e) => setCustomHook(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomHook()}
            className="flex-1 px-4 py-2.5 bg-[#0c0c0f] border border-[#2a2a35] rounded-lg text-[#f8f8f8] text-sm focus:outline-none focus:border-[#00b4d8]"
            data-testid="custom-hook-input"
          />
          <button
            onClick={addCustomHook}
            disabled={!customHook.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#00b4d8] text-white rounded-lg hover:bg-[#0096b7] text-sm disabled:opacity-50 transition-all"
            data-testid="add-custom-hook"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="text-center text-sm text-[#8b8b99]">
        {selectedHooks.length > 0 ? (
          <span>{selectedHooks.length} hook(s) will be displayed as text overlay on the video</span>
        ) : (
          <span>No text overlay — video will be assembled without hooks</span>
        )}
      </div>
    </div>
  );
}
