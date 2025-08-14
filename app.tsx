import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Settings, Minus, Plus, Volume2, VolumeX } from 'lucide-react';

const WimHofBreathingApp = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [phase, setPhase] = useState('inhale'); // 'inhale', 'exhale', 'hold'
  const [timer, setTimer] = useState(0);
  const [breathCount, setBreathCount] = useState(0);
  const [holdTime, setHoldTime] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  
  // Add sound settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.5);
  const [breathingTone, setBreathingTone] = useState('gentle'); // 'gentle', 'deep', 'ocean'
  // Settings
  const [breathsPerRound, setBreathsPerRound] = useState(30);
  const [initialHoldTime, setInitialHoldTime] = useState(30);
  const [holdIncrement, setHoldIncrement] = useState(30);
  const [totalRounds, setTotalRounds] = useState(3);
  const [customMode, setCustomMode] = useState(false);
  const [customHoldTimes, setCustomHoldTimes] = useState([30, 60, 90]);

  // Enhanced sound system with different tones
  const playBreathingSound = (type) => {
    if (!audioContextRef.current || !soundEnabled) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      const filterNode = audioContextRef.current.createBiquadFilter();
      
      oscillator.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      // Different tones based on user preference
      let baseFreq, filterFreq, waveType;
      switch (breathingTone) {
        case 'deep':
          baseFreq = { inhale: 110, exhale: 165, hold: 220, complete: 330 };
          filterFreq = 400;
          waveType = 'sawtooth';
          break;
        case 'ocean':
          baseFreq = { inhale: 100, exhale: 150, hold: 200, complete: 250 };
          filterFreq = 300;
          waveType = 'triangle';
          break;
        default: // gentle
          baseFreq = { inhale: 220, exhale: 330, hold: 440, complete: 523 };
          filterFreq = 800;
          waveType = 'sine';
      }
      
      // Set frequency based on breathing phase
      switch (type) {
        case 'inhale':
          oscillator.frequency.setValueAtTime(baseFreq.inhale, audioContextRef.current.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(baseFreq.exhale, audioContextRef.current.currentTime + 1.8);
          break;
        case 'exhale':
          oscillator.frequency.setValueAtTime(baseFreq.exhale, audioContextRef.current.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(baseFreq.inhale, audioContextRef.current.currentTime + 1.8);
          break;
        case 'hold':
          oscillator.frequency.setValueAtTime(baseFreq.hold, audioContextRef.current.currentTime);
          break;
        case 'complete':
          oscillator.frequency.setValueAtTime(baseFreq.complete, audioContextRef.current.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(baseFreq.complete * 1.5, audioContextRef.current.currentTime + 0.3);
          oscillator.frequency.exponentialRampToValueAtTime(baseFreq.complete * 2, audioContextRef.current.currentTime + 0.6);
          break;
        case 'roundComplete':
          // Special sound for round completion
          oscillator.frequency.setValueAtTime(baseFreq.complete, audioContextRef.current.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(baseFreq.complete * 1.2, audioContextRef.current.currentTime + 0.2);
          oscillator.frequency.exponentialRampToValueAtTime(baseFreq.complete * 0.8, audioContextRef.current.currentTime + 0.4);
          break;
        default:
          oscillator.frequency.setValueAtTime(baseFreq.inhale, audioContextRef.current.currentTime);
      }
      
      oscillator.type = waveType;
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(filterFreq, audioContextRef.current.currentTime);
      
      const duration = type === 'complete' ? 1 : type === 'hold' || type === 'roundComplete' ? 0.8 : 2;
      const volume = (type === 'hold' ? 0.15 : type === 'complete' || type === 'roundComplete' ? 0.2 : 0.1) * soundVolume;
      
      gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContextRef.current.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(volume * 0.7, audioContextRef.current.currentTime + duration * 0.8);
      gainNode.gain.linearRampToValueAtTime(0, audioContextRef.current.currentTime + duration);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration);
    } catch (error) {
      console.log('Audio playback failed:', error);
    }
  };
  
  const intervalRef = useRef(null);
  const audioContextRef = useRef(null);

  // Initialize audio context for breathing sounds
  useEffect(() => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.log('Audio context not available');
    }
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);



  // Get current hold time
  const getCurrentHoldTime = () => {
    if (customMode) {
      return customHoldTimes[currentRound - 1] || 30;
    }
    return initialHoldTime + (holdIncrement * (currentRound - 1));
  };

  // Start breathing session
  const startSession = () => {
    // Resume audio context if suspended
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    setIsActive(true);
    setCurrentRound(1);
    setCurrentCycle(0);
    setPhase('inhale');
    setTimer(0);
    setBreathCount(0);
    setHoldTime(0);
    
    // Play start sound
    setTimeout(() => playBreathingSound('inhale'), 500);
  };

  // Stop session
  const stopSession = () => {
    setIsActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setCurrentRound(1);
    setCurrentCycle(0);
    setPhase('inhale');
    setTimer(0);
    setBreathCount(0);
    setHoldTime(0);
  };

  // Pause/Resume session
  const toggleSession = () => {
    setIsActive(!isActive);
  };

  // Main breathing cycle logic
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive]);

  // Handle breathing phases
  useEffect(() => {
    if (!isActive) return;

    if (phase === 'inhale' || phase === 'exhale') {
      // Breathing phase (inhale for 2s, exhale for 2s)
      if (timer > 0 && timer % 2 === 0) {
        if (phase === 'inhale') {
          setPhase('exhale');
          playBreathingSound('exhale');
        } else {
          setPhase('inhale');
          setBreathCount(prev => prev + 1);
          playBreathingSound('inhale');
          
          // Check if completed breathing cycles for this round
          if (breathCount + 1 >= breathsPerRound) {
            setPhase('hold');
            setTimer(0);
            setHoldTime(getCurrentHoldTime());
            playBreathingSound('hold');
          }
        }
      }
    } else if (phase === 'hold') {
      // Hold phase
      if (timer >= holdTime) {
        // Complete current round
        if (currentRound < totalRounds) {
          setCurrentRound(prev => prev + 1);
          setBreathCount(0);
          setPhase('inhale');
          setTimer(0);
          playBreathingSound('roundComplete');
        } else {
          // Session complete
          stopSession();
          playBreathingSound('complete');
          setTimeout(() => {
            alert('Breathing session complete! Great job! 🎉');
          }, 1000);
        }
      }
    }
  }, [timer, phase, breathCount, holdTime, currentRound, breathsPerRound, totalRounds, isActive]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Settings component
  const SettingsPanel = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4">Breathing Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Breaths per round</label>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setBreathsPerRound(Math.max(20, breathsPerRound - 5))}
                className="p-1 bg-gray-200 rounded"
              >
                <Minus size={16} />
              </button>
              <span className="px-4 py-2 bg-gray-100 rounded">{breathsPerRound}</span>
              <button 
                onClick={() => setBreathsPerRound(Math.min(50, breathsPerRound + 5))}
                className="p-1 bg-gray-200 rounded"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Total rounds</label>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setTotalRounds(Math.max(1, totalRounds - 1))}
                className="p-1 bg-gray-200 rounded"
              >
                <Minus size={16} />
              </button>
              <span className="px-4 py-2 bg-gray-100 rounded">{totalRounds}</span>
              <button 
                onClick={() => setTotalRounds(Math.min(5, totalRounds + 1))}
                className="p-1 bg-gray-200 rounded"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">Enable breathing sounds</span>
            </label>
          </div>

          {soundEnabled && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Sound volume</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Quiet</span>
                  <span>Loud</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Breathing tone</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="breathingTone"
                      value="gentle"
                      checked={breathingTone === 'gentle'}
                      onChange={(e) => setBreathingTone(e.target.value)}
                      className="rounded"
                    />
                    <span className="text-sm">Gentle (Higher pitch)</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="breathingTone"
                      value="deep"
                      checked={breathingTone === 'deep'}
                      onChange={(e) => setBreathingTone(e.target.value)}
                      className="rounded"
                    />
                    <span className="text-sm">Deep (Lower pitch)</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="breathingTone"
                      value="ocean"
                      checked={breathingTone === 'ocean'}
                      onChange={(e) => setBreathingTone(e.target.value)}
                      className="rounded"
                    />
                    <span className="text-sm">Ocean (Soft waves)</span>
                  </label>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={customMode}
                onChange={(e) => setCustomMode(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">Custom hold times</span>
            </label>
          </div>

          {customMode ? (
            <div>
              <label className="block text-sm font-medium mb-2">Hold times per round (seconds)</label>
              {customHoldTimes.map((time, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <span className="w-16 text-sm">Round {index + 1}:</span>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => {
                        const newTimes = [...customHoldTimes];
                        newTimes[index] = Math.max(15, time - 15);
                        setCustomHoldTimes(newTimes);
                      }}
                      className="p-1 bg-gray-200 rounded"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm w-12 text-center">{time}s</span>
                    <button 
                      onClick={() => {
                        const newTimes = [...customHoldTimes];
                        newTimes[index] = Math.min(180, time + 15);
                        setCustomHoldTimes(newTimes);
                      }}
                      className="p-1 bg-gray-200 rounded"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Initial hold time (seconds)</label>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setInitialHoldTime(Math.max(15, initialHoldTime - 15))}
                    className="p-1 bg-gray-200 rounded"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="px-4 py-2 bg-gray-100 rounded">{initialHoldTime}s</span>
                  <button 
                    onClick={() => setInitialHoldTime(Math.min(120, initialHoldTime + 15))}
                    className="p-1 bg-gray-200 rounded"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Hold time increment per round</label>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setHoldIncrement(Math.max(15, holdIncrement - 15))}
                    className="p-1 bg-gray-200 rounded"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="px-4 py-2 bg-gray-100 rounded">+{holdIncrement}s</span>
                  <button 
                    onClick={() => setHoldIncrement(Math.min(60, holdIncrement + 15))}
                    className="p-1 bg-gray-200 rounded"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={() => setShowSettings(false)}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Save Settings
          </button>
          <button
            onClick={() => setShowSettings(false)}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-white shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Wim Hof Breathing</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title={soundEnabled ? 'Disable sound' : 'Enable sound'}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              disabled={isActive}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              title="Settings"
            >
              <Settings size={24} />
            </button>
          </div>
        </div>

        {/* Current Status */}
        <div className="text-center mb-8">
          <div className="text-6xl font-bold mb-2">
            {phase === 'hold' ? formatTime(holdTime - timer) : formatTime(timer)}
          </div>
          <div className="text-xl mb-4">
            {phase === 'hold' ? 'HOLD YOUR BREATH' : phase.toUpperCase()}
          </div>
          <div className="text-lg opacity-80">
            Round {currentRound} of {totalRounds}
          </div>
          {phase !== 'hold' && (
            <div className="text-lg opacity-80">
              Breath {breathCount} of {breathsPerRound}
            </div>
          )}
        </div>

        {/* Breathing Circle */}
        <div className="flex justify-center mb-8">
          <div 
            className={`w-32 h-32 rounded-full border-4 border-white/30 flex items-center justify-center transition-all duration-2000 ${
              phase === 'inhale' ? 'scale-110 bg-white/20' : 
              phase === 'exhale' ? 'scale-90 bg-white/5' : 
              'scale-125 bg-yellow-400/30 animate-pulse'
            }`}
          >
            <div className={`w-16 h-16 rounded-full transition-all duration-1000 ${
              phase === 'hold' ? 'bg-yellow-400' : 'bg-white/40'
            }`} />
          </div>
        </div>

        {/* Next Round Preview */}
        {phase === 'hold' && currentRound < totalRounds && (
          <div className="text-center mb-6 p-3 bg-white/10 rounded-lg">
            <div className="text-sm opacity-80">Next round hold time:</div>
            <div className="text-lg font-bold">
              {customMode ? 
                `${customHoldTimes[currentRound] || 30} seconds` :
                `${initialHoldTime + (holdIncrement * currentRound)} seconds`
              }
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center space-x-4">
          {!isActive ? (
            <button
              onClick={startSession}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
            >
              <Play size={20} />
              <span>Start Session</span>
            </button>
          ) : (
            <>
              <button
                onClick={toggleSession}
                className="flex items-center space-x-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-medium transition-colors"
              >
                <Pause size={20} />
                <span>Pause</span>
              </button>
              <button
                onClick={stopSession}
                className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
              >
                <Square size={20} />
                <span>Stop</span>
              </button>
            </>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 text-sm opacity-80">
          <p className="mb-2">
            <strong>Instructions:</strong>
          </p>
          <p className="mb-1">1. Breathe deeply {breathsPerRound} times</p>
          <p className="mb-1">2. Hold your breath after exhaling</p>
          <p>3. Repeat for {totalRounds} rounds</p>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && <SettingsPanel />}
    </div>
  );
};

export default WimHofBreathingApp;