import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import TranslatedText from '../components/TranslatedText';
import { useLanguage } from '../context/LanguageContext';
import { apiFetch } from '../utils/api';
import { translate } from '../utils/translate';
import ReactMarkdown from 'react-markdown';

const MarkdownComponents = {
  p: ({ node, ...props }) => <p className="mb-3 leading-relaxed" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 space-y-2" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-2" {...props} />,
  li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
  h3: ({ node, ...props }) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
  h4: ({ node, ...props }) => <h4 className="text-base font-bold mt-3 mb-2" {...props} />,
};

export default function Detect() {
  const { language } = useLanguage();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [remedies, setRemedies] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGettingRemedies, setIsGettingRemedies] = useState(false);
  const [error, setError] = useState(null);

  function onChoose(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(f.type)) {
      setError(<TranslatedText text="Please upload a valid image file (JPG, PNG)" />);
      return;
    }

    if (f.size > 5 * 1024 * 1024) {
      setError(<TranslatedText text="File size must be less than 5MB" />);
      return;
    }

    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setRemedies(null);
    setError(null);
  }

  function onDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(f.type)) {
      setError('Please upload a valid image file (JPG, PNG)');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setRemedies(null);
    setError(null);
  }

  function onDragOver(e) { e.preventDefault(); }
  function onDragEnter(e) { e.preventDefault(); }
  function onDragLeave(e) { e.preventDefault(); }

  async function analyzeDisease() {
    if (!file) return;

    setIsProcessing(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await apiFetch('/api/disease/detect', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`${translate('Detection failed')}: ${response.status}`);
      }

      const data = await response.json();
      const detectionSource = data.detection_source || 'kindwise';

      if (data.result) {
        const plantInfo = data.result.plant_identification;

        if (!data.result.is_healthy && data.result.disease && data.result.disease.suggestions && data.result.disease.suggestions.length > 0) {
          // Disease detected
          const topDisease = data.result.disease.suggestions[0];
          setResult({
            diseaseName: topDisease.name,
            probability: Math.round(topDisease.probability * 100),
            description: topDisease.description || translate('No description available'),
            treatment: topDisease.treatment || translate('No specific remedies found. Please consult an expert.'),
            nextSteps: topDisease.next_steps || null,
            isHealthy: false,
            healthStatus: data.result.health_status,
            detectionSource,
            plantInfo: plantInfo ? {
              scientificName: plantInfo.scientific_name,
              commonNames: plantInfo.common_names || [],
              primaryCommonName: plantInfo.scientific_name,
              identificationProbability: Math.round(plantInfo.probability * 100)
            } : null
          });
        } else {
          // Plant is healthy
          setResult({
            isHealthy: true,
            healthStatus: data.result.health_status || 'Healthy Plant',
            message: translate('Your crop appears to be healthy! No diseases detected.'),
            healthyAdvice: data.result.ai_healthy_advice || null,
            detectionSource,
            plantInfo: plantInfo ? {
              scientificName: plantInfo.scientific_name,
              commonNames: plantInfo.common_names || [],
              primaryCommonName: plantInfo.scientific_name,
              identificationProbability: Math.round(plantInfo.probability * 100)
            } : null
          });
        }
      } else {
        setResult({
          isHealthy: true,
          message: translate('No diseases detected. Your crop appears to be healthy!'),
          probability: 0
        });
      }
    } catch (error) {
      console.error('Disease detection error:', error);
      setError(<TranslatedText text="Failed to analyze the image. Please try again with a clearer photo." />);
    } finally {
      setIsProcessing(false);
    }
  }

  function resetDetection() {
    setPreview(null);
    setFile(null);
    setResult(null);
    setError(null);
  }

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 transition-all duration-300">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800"><TranslatedText text="Disease Detection" /></h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
              <TranslatedText text="Upload a photo of your crop to detect diseases" /> 🔬
            </p>
          </header>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mb-6 flex items-start gap-4">
              <div className="text-2xl">⚠</div>
              <div className="flex-1 text-red-700 font-medium">{error}</div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-700 text-xl font-bold leading-none"
              >
                ×
              </button>
            </div>
          )}

          {!preview && !result && (
            <div
              className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border-2 border-dashed border-gray-200 hover:border-emerald-400 transition-colors text-center cursor-pointer group"
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
            >
              <div className="mb-6 transform group-hover:scale-110 transition-transform duration-300">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
                  <path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19Z" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-20 group-hover:opacity-100 transition-opacity" />
                  <path d="M8.5 14L11 16.5L16.5 9.5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2"><TranslatedText text="Upload Crop Photo" /></h3>
              <p className="text-gray-500 mb-8"><TranslatedText text="Drag and drop your image here, or click to browse" /></p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <label className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-medium cursor-pointer shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-1">
                  📁 Choose File
                  <input type="file" accept="image/*" onChange={onChoose} className="hidden" />
                </label>
                <button
                  onClick={() => alert('Camera capture will be available in the mobile app')}
                  className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-8 py-3 rounded-xl font-medium transition-colors"
                >
                  📷 Camera
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-6">Supported formats: JPG, PNG • Max size: 5MB</p>
            </div>
          )}

          {preview && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 items-center md:items-start animate-fade-in">
              <div className="relative w-full md:w-1/3 aspect-square rounded-2xl overflow-hidden bg-gray-100 group">
                <img src={preview} alt="Crop preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={resetDetection}
                    className="bg-white/90 text-red-500 rounded-full p-2 hover:bg-white transition-colors"
                    title="Remove image"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 w-full">
                <h4 className="text-xl font-bold text-gray-800 mb-2">Ready for Analysis</h4>
                <p className="text-gray-500 mb-6">Click "Analyze Photo" to detect diseases in your crop image</p>

                <div className="flex gap-4">
                  <button
                    onClick={analyzeDisease}
                    disabled={isProcessing || !file}
                    className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>📐 Analyze Photo</>
                    )}
                  </button>
                  <button
                    onClick={resetDetection}
                    className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-8 bg-white rounded-3xl overflow-hidden shadow-lg border border-gray-100 animate-slide-up">
              <div className={`p-6 border-b ${result.isHealthy ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} flex justify-between items-center flex-wrap gap-4`}>
                <h3 className={`text-xl font-bold flex items-center gap-2 ${result.isHealthy ? 'text-emerald-800' : 'text-red-800'}`}>
                  {result.isHealthy ? (
                    <>✅ Healthy Plant</>
                  ) : (
                    <>🦠 Disease Detected</>
                  )}
                </h3>
                {(result.probability || result.plantInfo?.identificationProbability) && (
                  <div className="flex items-center gap-2">
                    {result.detectionSource && (
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        result.detectionSource === 'cnn_model' ? 'bg-purple-100 text-purple-700' :
                        result.detectionSource === 'kindwise' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {result.detectionSource === 'cnn_model' ? '🤖 AI Model' :
                         result.detectionSource === 'kindwise' ? '🔬 KindWise' :
                         '🧠 Gemini'}
                      </div>
                    )}
                    <div className={`px-3 py-1 rounded-full text-sm font-bold ${result.isHealthy ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {result.probability || result.plantInfo?.identificationProbability}% confidence
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 space-y-8">
                {/* Plant Identification Section */}
                {result.plantInfo && (
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">🌱 Plant Identification</h4>
                    <div className="grid md:grid-cols-2 gap-6">
                      {result.plantInfo.primaryCommonName && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Common Name</p>
                          <p className="font-bold text-gray-800 text-lg capitalize">{result.plantInfo.primaryCommonName}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Scientific Name</p>
                        <p className="font-medium text-gray-800 italic">{result.plantInfo.scientificName}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500 mb-1">Other Names</p>
                        <p className="text-gray-700">{result.plantInfo.commonNames?.slice(1).join(', ') || 'None'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Health Status Section */}
                <div>
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">🩺 Health Assessment</h4>
                  <div className={`p-4 rounded-xl border ${result.isHealthy ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'} font-medium`}>
                    {result.healthStatus || (result.isHealthy ? 'Plant appears healthy' : 'Disease detected')}
                  </div>
                </div>

                {result.isHealthy ? (
                  <div className="space-y-6">
                    <div className="bg-emerald-50 p-6 md:p-8 rounded-3xl border border-emerald-100 shadow-sm flex items-center gap-4">
                      <div className="text-4xl">✨</div>
                      <div>
                        <p className="text-emerald-900 text-xl font-extrabold">{result.message}</p>
                      </div>
                    </div>
                    {result.healthyAdvice && (
                      <div className="bg-emerald-50/40 rounded-3xl p-6 md:p-8 border border-emerald-100 shadow-sm transition-all hover:shadow-md">
                        <h4 className="text-emerald-800 font-extrabold mb-5 flex items-center gap-3 text-lg">
                          🌱 <TranslatedText text="Expert AI Care Tips" />
                        </h4>
                        <div className="text-emerald-900 text-sm md:text-base opacity-95">
                          <ReactMarkdown components={MarkdownComponents}>
                            {result.healthyAdvice}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Disease Alert Card */}
                    <div className="bg-red-50 p-6 md:p-8 rounded-3xl border-2 border-red-100/80 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-bl-full -mr-8 -mt-8 opacity-50"></div>
                      <div className="relative z-10 flex items-start gap-4 flex-col md:flex-row md:items-start">
                        <div className="text-4xl md:text-5xl mt-1 drop-shadow-sm self-start">🦠</div>
                        <div className="flex-1 w-full">
                          <p className="text-sm font-bold text-red-500 tracking-widest uppercase mb-1">
                            <TranslatedText text="Disease Detected" />
                          </p>
                          <h3 className="text-2xl md:text-3xl font-black text-red-900 capitalize mb-4">
                            {result.diseaseName}
                          </h3>

                          {result.description && (
                            <div className="mt-5 pt-5 border-t border-red-200/60">
                              <h4 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
                                📊 <TranslatedText text="Overview" />
                              </h4>
                              <div className="text-red-900 text-sm md:text-base opacity-90">
                                <ReactMarkdown components={MarkdownComponents}>
                                  {result.description}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Treatment Card */}
                    {result.treatment && (
                      <div className="bg-blue-50/50 p-6 md:p-8 rounded-3xl border border-blue-100 shadow-sm transition-all hover:shadow-md">
                        <h4 className="text-blue-900 font-extrabold mb-5 flex items-center gap-3 text-lg">
                          💊 <TranslatedText text="Recommended Treatment" />
                        </h4>
                        <div className="text-blue-900 text-sm md:text-base opacity-95">
                          <ReactMarkdown components={MarkdownComponents}>
                            {result.treatment}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {/* Next Steps Card */}
                    {result.nextSteps && (
                      <div className="bg-amber-50/40 p-6 md:p-8 rounded-3xl border border-amber-100 shadow-sm transition-all hover:shadow-md">
                        <h4 className="text-amber-900 font-extrabold mb-5 flex items-center gap-3 text-lg">
                          🚨 <TranslatedText text="Immediate Next Steps" />
                        </h4>
                        <div className="text-amber-900 text-sm md:text-base opacity-95">
                          <ReactMarkdown components={MarkdownComponents}>
                            {result.nextSteps}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-6 border-t border-gray-100 text-xs text-center text-gray-500">
                  <strong>⚠ Disclaimer:</strong> This is an AI-based detection system. For accurate diagnosis and treatment, please consult with a qualified agricultural expert.
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
