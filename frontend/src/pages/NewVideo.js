import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { Video, ArrowLeft, Check, ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';

// Shared step components
import Step1SongInput from '../components/wizard/Step1SongInput';
import Step2SelectClimax from '../components/wizard/Step2SelectClimax';

// AI Mode step components
import Step3VisualConcept from '../components/wizard/Step3VisualConcept';
import Step4GenerateImages from '../components/wizard/Step4GenerateImages';
import Step5AnimateClips from '../components/wizard/Step5AnimateClips';

// Library Mode step components
import StepMediaLibrary from '../components/wizard/StepMediaLibrary';
import StepHooksText from '../components/wizard/StepHooksText';

// Shared final steps
import Step6AssembleVideo from '../components/wizard/Step6AssembleVideo';
import Step7ExportPublish from '../components/wizard/Step7ExportPublish';
import ModeSelection from '../components/wizard/ModeSelection';

const AI_STEPS = [
  { id: 1, name: 'Song Input', shortName: 'Song' },
  { id: 2, name: 'Select Climax', shortName: 'Climax' },
  { id: 3, name: 'Visual Concept', shortName: 'Concept' },
  { id: 4, name: 'Generate Images', shortName: 'Images' },
  { id: 5, name: 'Animate Clips', shortName: 'Animate' },
  { id: 6, name: 'Assemble Video', shortName: 'Assemble' },
  { id: 7, name: 'Export & Publish', shortName: 'Export' },
];

const LIBRARY_STEPS = [
  { id: 1, name: 'Song Input', shortName: 'Song' },
  { id: 2, name: 'Select Climax', shortName: 'Climax' },
  { id: 3, name: 'Media Library', shortName: 'Media' },
  { id: 4, name: 'Hooks & Text', shortName: 'Hooks' },
  { id: 5, name: 'Assemble Video', shortName: 'Assemble' },
  { id: 6, name: 'Export & Publish', shortName: 'Export' },
];

const initialProjectState = {
  title: '',
  genre: '',
  lyrics: '',
  templateId: null,
  template: null,
  mode: null, // null = not yet selected, 'ai' or 'library'
  audioFile: null,
  audioUrl: null,
  uploadedImages: [],
  climaxStart: 0,
  climaxEnd: 30,
  concept: {
    theme: '',
    mood: '',
    palette: ['#1a1a2e', '#e94560', '#0f3460', '#f0a500'],
    prompts: ['', '', ''],
    hooks: [],
    selectedHooks: [],
    customInstructions: '',
    numImages: 3,
  },
  images: [],
  clips: [],
  media: [], // Library mode media pool
  imagePrompts: [], // Library mode AI prompts for external use
  metadata: {}, // Platform-specific metadata (TikTok/YouTube/IG/FB)
  thumbnails: {}, // Platform thumbnails
  assembledVideo: null,
  assemblySettings: {
    crossfade: 0.5,
    addTextOverlay: true,
    addSubtitles: false,
  },
  costs: {
    images: 0,
    clips: 0,
    assembly: 0,
  },
};

export default function NewVideo() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [project, setProject] = useState(initialProjectState);
  const [projectDbId, setProjectDbId] = useState(projectId || null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const mode = project.mode;
  const steps = mode === 'library' ? LIBRARY_STEPS : AI_STEPS;
  const maxStep = steps.length;

  useEffect(() => {
    fetchTemplates();
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId]);

  const fetchTemplates = async () => {
    try {
      const { data } = await api.get('/templates');
      setTemplates(data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  const loadProject = async (id) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/projects/${id}`);

      const loadedImages = (data.images || []).map(img => ({
        ...img,
        url: img.url || '',
        status: img.status || 'pending',
        cost: img.cost || 0,
      }));

      const loadedClips = (data.clips || []).map(clip => ({
        ...clip,
        status: clip.status || 'pending',
        cost: clip.cost || 0,
        duration: clip.duration || 5.0,
      }));

      const imageCost = loadedImages.reduce((sum, img) => sum + (img.cost || 0), 0);
      const clipCost = loadedClips.reduce((sum, c) => sum + (c.cost || 0), 0);

      const savedConcept = data.concept || {};
      const concept = {
        theme: savedConcept.theme || '',
        mood: savedConcept.mood || '',
        palette: savedConcept.palette || ['#1a1a2e', '#e94560', '#0f3460', '#f0a500'],
        prompts: savedConcept.prompts || ['', '', ''],
        hooks: savedConcept.hooks || [],
        selectedHooks: savedConcept.selectedHooks || [],
        customInstructions: savedConcept.customInstructions || '',
        numImages: savedConcept.numImages || 3,
        animationStyle: savedConcept.animationStyle || '',
        characterMode: savedConcept.characterMode || 'visible',
      };

      const projectMode = data.mode || 'ai';

      setProject({
        ...initialProjectState,
        title: data.title || '',
        genre: data.genre || '',
        lyrics: data.lyrics || '',
        templateId: data.templateId,
        mode: projectMode,
        climaxStart: data.climaxStart || 0,
        climaxEnd: data.climaxEnd || 30,
        concept,
        images: loadedImages,
        clips: loadedClips,
        media: data.media || [],
        imagePrompts: data.imagePrompts || [],
        metadata: data.metadata || {},
        thumbnails: data.thumbnails || {},
        assembledVideo: data.finalVideoPath ? {
          url: `/api/projects/${id}/final/video.mp4`,
          duration: 0,
          fileSize: 0,
        } : null,
        costs: {
          images: imageCost,
          clips: clipCost,
          assembly: 0,
        },
      });
      setProjectDbId(id);

      // Determine resume step based on mode
      let resumeStep = 1;
      if (projectMode === 'library') {
        if (data.title) resumeStep = 2;
        if (data.audioClimaxPath || data.climaxStart > 0) resumeStep = 3;
        if ((data.media || []).length > 0) resumeStep = 3;
        if ((data.media || []).filter(m => m.status === 'approved').length >= 2) resumeStep = 4;
        if (concept.selectedHooks.length > 0 || (data.media || []).filter(m => m.status === 'approved').length >= 2) resumeStep = 5;
        if (data.finalVideoPath) resumeStep = 6;
      } else {
        if (data.title) resumeStep = 2;
        if (data.audioClimaxPath || data.climaxStart > 0) resumeStep = 3;
        if (concept.prompts.some(p => p && p.trim())) resumeStep = 4;
        if (loadedImages.length > 0) resumeStep = 4;
        if (loadedImages.filter(img => img.status === 'approved').length >= 2) resumeStep = 5;
        if (loadedClips.length > 0) resumeStep = 5;
        if (loadedClips.filter(c => c.status === 'approved').length >= 2) resumeStep = 6;
        if (data.finalVideoPath) resumeStep = 7;
      }

      setCurrentStep(resumeStep);
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (projectDbId) return projectDbId;
    try {
      setSaving(true);
      const { data } = await api.post('/projects', {
        title: project.title || 'Untitled Project',
        genre: project.genre,
        lyrics: project.lyrics,
        templateId: project.templateId,
        mode: project.mode,
      });
      setProjectDbId(data._id);

      if (project.audioFile) {
        await uploadAudioFile(data._id, project.audioFile);
      }

      return data._id;
    } catch (err) {
      console.error('Failed to create project:', err);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const uploadAudioFile = async (projId, audioFile) => {
    try {
      const formData = new FormData();
      formData.append('file', audioFile);

      const { data } = await api.post(
        `/audio/upload/${projId}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      updateProject({ audioDuration: data.duration });
    } catch (err) {
      console.error('Failed to upload audio:', err);
    }
  };

  const saveProject = async (updates = {}) => {
    if (!projectDbId) return;
    try {
      setSaving(true);
      await api.put(`/projects/${projectDbId}`, updates);
    } catch (err) {
      console.error('Failed to save project:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateProject = useCallback((updatesOrFn) => {
    setProject(prev => {
      const updates = typeof updatesOrFn === 'function' ? updatesOrFn(prev) : updatesOrFn;
      return { ...prev, ...updates };
    });
  }, []);

  const totalCost = project.costs.images + project.costs.clips + project.costs.assembly;

  const canProceed = () => {
    if (mode === 'library') {
      switch (currentStep) {
        case 1: return project.title.trim() !== '';
        case 2: return project.climaxEnd > project.climaxStart;
        case 3: return (project.media || []).filter(m => m.status === 'approved').length >= 1;
        case 4: return true; // Hooks are optional
        case 5: return project.assembledVideo !== null;
        case 6: return true;
        default: return true;
      }
    } else {
      switch (currentStep) {
        case 1: return project.title.trim() !== '';
        case 2: return project.climaxEnd > project.climaxStart;
        case 3: return project.concept.prompts.some(p => p.trim() !== '');
        case 4: return project.images.filter(img => img.status === 'approved').length >= 2;
        case 5: return project.clips.filter(clip => clip.status === 'approved').length >= 2;
        case 6: return project.assembledVideo !== null;
        case 7: return true;
        default: return true;
      }
    }
  };

  const handleNext = async () => {
    let activeProjectId = projectDbId;

    if (currentStep === 1 && !projectDbId) {
      activeProjectId = await createProject();
      if (!activeProjectId) return; // creation failed
    }

    // Extract climax audio when leaving Step 2
    // Fire if we have a project AND there is audio (either in-memory File or already on disk)
    if (currentStep === 2 && activeProjectId) {
      try {
        await api.post(
          `/audio/extract-climax/${activeProjectId}`,
          {
            projectId: activeProjectId,
            start: project.climaxStart,
            end: project.climaxEnd
          }
        );
      } catch (err) {
        // 400 "No audio file uploaded" is expected if user hasn't uploaded audio yet
        const detail = err.response?.data?.detail || '';
        if (!detail.includes('No audio file')) {
          console.error('Failed to extract climax:', err);
        }
      }
    }

    if (mode === 'ai') {
      // Save concept when leaving Step 3
      if (currentStep === 3 && activeProjectId) {
        try {
          await api.put(`/projects/${activeProjectId}/concept`, { concept: project.concept });
        } catch (err) {
          console.error('Failed to save concept:', err);
        }
      }

      // Save images when leaving Step 4
      if (currentStep === 4 && activeProjectId) {
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
          await api.put(`/projects/${activeProjectId}/images`, { images: imagesToSave });
        } catch (err) {
          console.error('Failed to save images:', err);
        }
      }

      // Save clips when leaving Step 5
      if (currentStep === 5 && activeProjectId) {
        try {
          const clipsToSave = project.clips.map(clip => ({
            id: clip.id,
            imageId: clip.imageId || '',
            clipUrl: clip.clipUrl || '',
            clipPath: clip.clipPath || '',
            duration: clip.duration || 0,
            status: clip.status || 'pending',
            cost: clip.cost || 0,
          }));
          await api.put(`/projects/${activeProjectId}/clips`, { clips: clipsToSave });
        } catch (err) {
          console.error('Failed to save clips:', err);
        }
      }
    } else if (mode === 'library') {
      // Save media pool when leaving Step 3
      if (currentStep === 3 && activeProjectId) {
        try {
          await api.put(`/projects/${activeProjectId}/media`, {
            media: project.media.map(m => ({
              id: m.id,
              type: m.type,
              thumbnailUrl: m.thumbnailUrl || '',
              sourceUrl: m.sourceUrl || '',
              localPath: m.localPath || '',
              mediaUrl: m.mediaUrl || '',
              duration: m.duration || 0,
              animate: m.animate || false,
              stillDuration: m.stillDuration || 4,
              clipUrl: m.clipUrl || '',
              clipPath: m.clipPath || '',
              clipDuration: m.clipDuration || 0,
              status: m.status || 'pending',
              pexelsId: m.pexelsId || null,
              filename: m.filename || '',
            }))
          });
        } catch (err) {
          console.error('Failed to save media:', err);
        }
      }

      // Save concept (hooks) when leaving Step 4
      if (currentStep === 4 && activeProjectId) {
        try {
          await api.put(`/projects/${activeProjectId}/concept`, { concept: project.concept });
        } catch (err) {
          console.error('Failed to save hooks:', err);
        }
      }
    }

    if (currentStep < maxStep) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateAnother = () => {
    setProject(initialProjectState);
    setProjectDbId(null);
    setCurrentStep(1);
    navigate('/new');
  };

  const handleModeSelect = (selectedMode) => {
    updateProject({ mode: selectedMode });
  };

  const renderStep = () => {
    const props = {
      project,
      updateProject,
      templates,
      projectId: projectDbId,
      saveProject,
      createProject,
    };

    if (mode === 'library') {
      switch (currentStep) {
        case 1: return <Step1SongInput {...props} />;
        case 2: return <Step2SelectClimax {...props} />;
        case 3: return <StepMediaLibrary {...props} />;
        case 4: return <StepHooksText {...props} />;
        case 5: return <Step6AssembleVideo {...props} />;
        case 6: return <Step7ExportPublish {...props} onCreateAnother={handleCreateAnother} />;
        default: return null;
      }
    } else {
      switch (currentStep) {
        case 1: return <Step1SongInput {...props} />;
        case 2: return <Step2SelectClimax {...props} />;
        case 3: return <Step3VisualConcept {...props} />;
        case 4: return <Step4GenerateImages {...props} />;
        case 5: return <Step5AnimateClips {...props} />;
        case 6: return <Step6AssembleVideo {...props} />;
        case 7: return <Step7ExportPublish {...props} onCreateAnother={handleCreateAnother} />;
        default: return null;
      }
    }
  };

  // Show mode selection if no mode is set
  if (!mode) {
    return (
      <div className="min-h-screen bg-[#0c0c0f] flex flex-col">
        <header className="sticky top-0 z-50 bg-[#0c0c0f]/80 backdrop-blur-xl border-b border-[#2a2a35] px-4 md:px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center gap-4">
            <Link
              to="/"
              className="p-2 text-[#8b8b99] hover:text-[#f8f8f8] hover:bg-[#141418] rounded-lg transition-all"
              data-testid="back-to-dashboard"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </Link>
            <div className="flex items-center gap-3">
              <Video className="w-6 h-6 text-[#e94560]" strokeWidth={1.5} />
              <h1 className="font-heading text-lg font-bold text-[#f8f8f8]">New Video</h1>
            </div>
          </div>
        </header>
        <main className="flex-1">
          <ModeSelection onSelect={handleModeSelect} />
        </main>
      </div>
    );
  }

  const accentColor = mode === 'library' ? '#00b4d8' : '#e94560';

  return (
    <div className="min-h-screen bg-[#0c0c0f] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0c0c0f]/80 backdrop-blur-xl border-b border-[#2a2a35] px-4 md:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link
            to="/"
            className="p-2 text-[#8b8b99] hover:text-[#f8f8f8] hover:bg-[#141418] rounded-lg transition-all"
            data-testid="back-to-dashboard"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          </Link>
          <div className="flex items-center gap-3">
            <Video className="w-6 h-6" style={{ color: accentColor }} strokeWidth={1.5} />
            <h1 className="font-heading text-lg font-bold text-[#f8f8f8]">
              {project.title || 'New Video'}
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full uppercase tracking-wider" style={{
              background: `${accentColor}20`,
              color: accentColor,
            }}>
              {mode === 'library' ? 'Library' : 'AI'}
            </span>
          </div>
          {saving && (
            <span className="text-xs text-[#8b8b99] ml-auto">Saving...</span>
          )}
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-[#141418] border-b border-[#2a2a35] px-4 py-3 overflow-x-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between min-w-[500px]">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                  disabled={step.id > currentStep}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                    step.id === currentStep
                      ? 'text-white'
                      : step.id < currentStep
                      ? 'bg-[#10b981]/20 text-[#10b981] cursor-pointer hover:bg-[#10b981]/30'
                      : 'text-[#8b8b99] cursor-not-allowed'
                  }`}
                  style={step.id === currentStep ? { background: accentColor } : undefined}
                  data-testid={`step-${step.id}`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    step.id < currentStep ? 'bg-[#10b981]' : step.id === currentStep ? 'bg-white/20' : 'bg-[#2a2a35]'
                  }`}>
                    {step.id < currentStep ? <Check className="w-3 h-3" /> : step.id}
                  </span>
                  <span className="text-sm font-medium hidden md:inline">{step.shortName}</span>
                </button>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    step.id < currentStep ? 'bg-[#10b981]' : 'bg-[#2a2a35]'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4 md:p-6">
          {renderStep()}
        </div>
      </main>

      {/* Footer with Navigation and Cost */}
      <footer className="sticky bottom-0 bg-[#141418] border-t border-[#2a2a35] px-4 md:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 bg-[#0c0c0f] px-4 py-2 rounded-lg border border-[#2a2a35]">
            <DollarSign className="w-4 h-4" style={{ color: accentColor }} strokeWidth={1.5} />
            <span className="text-sm text-[#8b8b99]">Est. cost:</span>
            <span className="font-heading font-semibold" style={{ color: accentColor }} data-testid="total-cost">
              ${totalCost.toFixed(2)} USD
            </span>
          </div>

          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 bg-[#0c0c0f] border border-[#2a2a35] text-[#f8f8f8] rounded-lg hover:bg-[#1e1e24] transition-all"
                data-testid="back-button"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            {currentStep < maxStep && (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: accentColor }}
                data-testid="next-button"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
