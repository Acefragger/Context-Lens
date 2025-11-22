import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import Auth from './components/Auth';
import HistorySidebar from './components/HistorySidebar';
import { analyzeImage } from './services/geminiService';
import { StorageService } from './services/storageService';
import { FullAnalysisResponse, UserProfile, HistoryItem } from './types';

const LOADING_MESSAGES = [
  "Analyzing visual data...",
  "Identifying objects and context...",
  "Detecting potential issues...",
  "Searching for solutions...",
  "Estimating repair costs..."
];

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // App State
  const [file, setFile] = useState<File | null>(null);
  // Used when loading history items (which are base64/URL strings), overriding the 'File' object
  const [restoredPreviewUrl, setRestoredPreviewUrl] = useState<string | null>(null);
  
  const [note, setNote] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<FullAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Loading animation state
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Initialize User and History
  useEffect(() => {
    const storedUser = StorageService.getUser();
    if (storedUser) {
      setUser(storedUser);
      setHistory(StorageService.getHistory());
    }
  }, []);

  // Helper to determine which preview to show
  const currentPreviewUrl = useMemo(() => {
    if (restoredPreviewUrl) return restoredPreviewUrl;
    return file ? URL.createObjectURL(file) : null;
  }, [file, restoredPreviewUrl]);

  // Manage loading animation
  useEffect(() => {
    let progressInterval: any;
    let messageInterval: any;

    if (isAnalyzing) {
      setLoadingProgress(0);
      setLoadingMessageIndex(0);
      
      // Smooth progress bar simulation
      progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          const increment = prev < 30 ? 2 : prev < 60 ? 1 : 0.5;
          const newProgress = prev + increment;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 100);

      // Rotate messages
      messageInterval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);

    } else {
      setLoadingProgress(100);
    }

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [isAnalyzing]);

  const handleLogin = (newUser: UserProfile) => {
    StorageService.saveUser(newUser);
    setUser(newUser);
    setHistory(StorageService.getHistory());
  };

  const handleLogout = () => {
    StorageService.clearUser();
    setUser(null);
    setHistory([]);
    handleClear();
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setRestoredPreviewUrl(null); // Clear restored history image
    setError(null);
  };

  const handleClear = () => {
    setFile(null);
    setRestoredPreviewUrl(null);
    setResult(null);
    setNote('');
    setError(null);
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setRestoredPreviewUrl(item.imagePreview);
    setNote(item.note);
    setResult(item.result);
    setFile(null); // Clear file input as we are viewing history
  };

  const handleClearHistory = () => {
    StorageService.clearUser(); // Just clears history in this simple impl
    setHistory([]);
    // Re-save user but without history context
    if (user) StorageService.saveUser(user);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        // Keep full string for storage/preview, split for API
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAnalyze = async () => {
    if (!file || !user) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const fullBase64 = await fileToBase64(file);
      const base64Data = fullBase64.split(',')[1]; // Remove prefix for API
      const mimeType = file.type;
      
      const analysisResponse = await analyzeImage(base64Data, mimeType, note, user.currency);
      setResult(analysisResponse);

      // Save to history
      StorageService.addToHistory(fullBase64, note, analysisResponse);
      setHistory(StorageService.getHistory());

    } catch (err) {
      console.error(err);
      setError("Failed to analyze the image. Please ensure you have a valid API key and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // If not logged in, show Auth
  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Header 
        user={user} 
        onOpenHistory={() => setIsHistoryOpen(true)} 
        onLogout={handleLogout}
      />
      
      <HistorySidebar 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectHistory={handleSelectHistory}
        onClearHistory={handleClearHistory}
      />

      <main className="max-w-3xl mx-auto px-4 pt-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start animate-fade-in-up">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {!result ? (
          isAnalyzing ? (
            /* Loading View */
            <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[450px] animate-fade-in-up">
              <style>{`
                @keyframes scan {
                  0% { top: 0%; opacity: 0.5; }
                  50% { top: 100%; opacity: 1; }
                  100% { top: 0%; opacity: 0.5; }
                }
              `}</style>

              <div className="relative w-32 h-32 mb-8 rounded-2xl overflow-hidden shadow-lg ring-4 ring-indigo-50">
                {currentPreviewUrl && (
                  <img 
                    src={currentPreviewUrl} 
                    className="w-full h-full object-cover opacity-80" 
                    alt="Analyzing" 
                  />
                )}
                <div className="absolute inset-0 bg-indigo-500/10"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-2">Analyzing Image</h3>
              
              <p className="text-slate-500 font-medium mb-8 h-6 transition-all duration-300 text-center">
                {LOADING_MESSAGES[loadingMessageIndex]}
              </p>

              <div className="w-full max-w-md bg-slate-100 rounded-full h-3 mb-4 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              
              <p className="text-xs text-slate-400">
                This may take a few seconds...
              </p>
            </div>
          ) : (
            /* Input View */
            <div className="space-y-6 animate-fade-in-up">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Upload an object or scene</h2>
                <FileUpload 
                  onFileSelect={handleFileSelect} 
                  selectedFile={file} 
                  onClear={handleClear} 
                />

                {/* If we have a restored preview but no file object (viewing history), show it */}
                {!file && restoredPreviewUrl && (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-md group mb-6">
                    <img 
                      src={restoredPreviewUrl} 
                      alt="History Preview" 
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button 
                        onClick={handleClear}
                        className="bg-white/90 text-slate-700 px-4 py-2 rounded-full font-medium shadow-lg hover:bg-white transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="context-note" className="block text-sm font-medium text-slate-700">
                    Add context note (optional)
                  </label>
                  <input
                    id="context-note"
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g., 'my toaster sparks', 'broken hinge', 'weird noise'"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={(!file && !restoredPreviewUrl)}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-md hover:shadow-lg transform transition-all duration-200 active:scale-[0.98]"
              >
                Analyze Image
              </button>
            </div>
          )
        ) : (
          /* Results View */
          <div className="animate-fade-in-up pb-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Analysis Result</h2>
              <button 
                onClick={handleClear}
                className="text-indigo-600 font-medium hover:text-indigo-800 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                Analyze Another
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
              {/* Header Image */}
              <div className="h-48 w-full relative bg-slate-100">
                 <img 
                    src={currentPreviewUrl || ''} 
                    alt="Analyzed Object" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-6">
                    <div className="flex items-center space-x-2 mb-1">
                       <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${
                          (result.data?.confidence_score || 0) > 80 ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
                       }`}>
                         {result.data?.confidence_score || 0}% Confidence
                       </span>
                    </div>
                    <h1 className="text-3xl font-bold text-white shadow-sm">{result.data?.object_name || "Object Detected"}</h1>
                  </div>
              </div>

              <div className="p-6 md:p-8 space-y-8">
                
                {/* Safety Warning */}
                {result.data?.safety_warning && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Safety Warning</h3>
                        <div className="mt-1 text-sm text-red-700">
                          {result.data.safety_warning}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Issue & Causes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">The Issue</h3>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 h-full">
                      <p className="text-lg font-medium text-slate-800 mb-2">{result.data?.issue_detected}</p>
                      <p className="text-slate-600 text-sm leading-relaxed">{result.data?.importance}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Likely Causes</h3>
                    <ul className="space-y-2">
                      {(result.data?.likely_causes || []).map((cause, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="flex-shrink-0 h-5 w-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="text-slate-700">{cause}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Action Plan */}
                <div>
                   <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">How to Fix It</h3>
                   <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100">
                      <div className="space-y-4">
                        {(result.data?.steps || []).map((step, idx) => (
                          <div key={idx} className="flex">
                            <div className="flex-shrink-0 mr-4">
                              <div className="h-8 w-8 rounded-full bg-white border-2 border-indigo-200 flex items-center justify-center text-indigo-600 font-bold shadow-sm">
                                {idx + 1}
                              </div>
                            </div>
                            <p className="text-slate-700 mt-1">{step}</p>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>

                {/* Estimates & Products */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Estimates</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Estimated Cost</p>
                        <p className="text-lg font-bold text-slate-800">{result.data?.estimation?.price_range || "N/A"}</p>
                      </div>
                      <div>
                         <p className="text-xs text-slate-500 mb-1">Time to Fix</p>
                        <p className="text-lg font-bold text-slate-800">{result.data?.estimation?.time_estimate || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Product Recommendations */}
                  <div className="bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl p-5 text-white shadow-lg transform hover:scale-[1.02] transition-transform">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xs font-bold text-indigo-100 uppercase tracking-wider">Parts & Tools</h3>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    
                    {result.data?.product_search_query ? (
                      <>
                        <p className="text-sm text-indigo-100 mb-4">
                          Based on our analysis, you might need parts like:
                          <br/>
                          <span className="font-bold text-white italic">"{result.data.product_search_query}"</span>
                        </p>
                        <a 
                          href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(result.data.product_search_query)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full text-center bg-white text-indigo-600 py-2.5 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
                        >
                          Find on Google Shopping
                        </a>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-indigo-100 mb-4">
                           No specific parts detected, but you can browse tools or related items.
                        </p>
                        <a 
                          href={`https://www.google.com/search?q=${encodeURIComponent(result.data?.object_name + " fix")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full text-center bg-white/20 hover:bg-white/30 text-white py-2.5 rounded-lg font-semibold transition-colors border border-white/30"
                        >
                          Search Solutions
                        </a>
                      </>
                    )}
                  </div>
                </div>

                {/* Grounding Sources */}
                {result.groundingSources && result.groundingSources.length > 0 && (
                  <div className="border-t border-slate-100 pt-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Sources</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.groundingSources.map((source, idx) => (
                        <a 
                          key={idx}
                          href={source.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full transition-colors truncate max-w-[200px]"
                        >
                          {source.title || "Source Link"}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback for parse failure */}
                {!result.data && result.rawText && (
                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                    <h3 className="font-bold text-orange-800 mb-2">Raw Analysis</h3>
                    <p className="text-sm text-orange-800 whitespace-pre-wrap">{result.rawText}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;