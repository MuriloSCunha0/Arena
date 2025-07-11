import React, { useEffect, useState } from 'react';
import { useEventsStore } from '../../store';
import { Button } from '../ui/Button';
import { Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { requestCache } from '../../utils/requestCache';

export const EventLoadTest: React.FC<{ eventId: string }> = ({ eventId }) => {
  const { currentEvent, loading, error, getByIdWithOrganizer, clearError } = useEventsStore();
  const [testLog, setTestLog] = useState<string[]>([]);
  const [isManualLoading, setIsManualLoading] = useState(false);

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    addToLog(`Component mounted with eventId: ${eventId}`);
  }, [eventId]);

  useEffect(() => {
    if (loading) {
      addToLog('Loading state: TRUE');
    } else {
      addToLog('Loading state: FALSE');
    }
  }, [loading]);

  useEffect(() => {
    if (error) {
      addToLog(`Error detected: ${error}`);
    }
  }, [error]);

  useEffect(() => {
    if (currentEvent) {
      addToLog(`Event loaded: ${currentEvent.id} - ${currentEvent.title}`);
    }
  }, [currentEvent]);

  const handleManualLoad = async () => {
    setIsManualLoading(true);
    addToLog('Manual load initiated');
    clearError();
    
    try {
      await getByIdWithOrganizer(eventId);
      addToLog('Manual load completed successfully');
    } catch (err) {
      addToLog(`Manual load failed: ${err}`);
    } finally {
      setIsManualLoading(false);
    }
  };

  const handleClearCache = () => {
    requestCache.clear();
    addToLog('Request cache cleared');
  };

  const getCacheStats = () => {
    const stats = requestCache.getStats();
    addToLog(`Cache stats - Size: ${stats.size}, Keys: ${stats.keys.join(', ')}`);
  };

  const clearLog = () => {
    setTestLog([]);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Load Test</h2>
        <p className="text-gray-600">Event ID: {eventId}</p>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className={`p-4 rounded-lg border ${loading ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center space-x-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> : <CheckCircle className="w-5 h-5 text-gray-400" />}
            <span className="font-medium">Loading</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{loading ? 'Active' : 'Idle'}</p>
        </div>

        <div className={`p-4 rounded-lg border ${error ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center space-x-2">
            {error ? <XCircle className="w-5 h-5 text-red-600" /> : <CheckCircle className="w-5 h-5 text-gray-400" />}
            <span className="font-medium">Error</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{error ? 'Has Error' : 'No Error'}</p>
        </div>

        <div className={`p-4 rounded-lg border ${currentEvent ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center space-x-2">
            <CheckCircle className={`w-5 h-5 ${currentEvent ? 'text-green-600' : 'text-gray-400'}`} />
            <span className="font-medium">Event Loaded</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{currentEvent ? 'Yes' : 'No'}</p>
        </div>
      </div>

      {/* Current State */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Current State</h3>
        <div className="space-y-2">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 font-medium">Error:</p>
              <p className="text-red-700">{error}</p>
            </div>
          )}
          {currentEvent && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 font-medium">Event Loaded:</p>
              <p className="text-green-700">{currentEvent.title}</p>
              <p className="text-green-600 text-sm">ID: {currentEvent.id}</p>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex space-x-3 mb-6">
        <Button
          onClick={handleManualLoad}
          disabled={isManualLoading}
          className="flex items-center space-x-2"
        >
          {isManualLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span>Manual Load</span>
        </Button>
        
        <Button onClick={clearError} variant="outline">
          Clear Error
        </Button>
        
        <Button onClick={handleClearCache} variant="outline">
          Clear Cache
        </Button>
        
        <Button onClick={getCacheStats} variant="outline">
          Cache Stats
        </Button>
        
        <Button onClick={clearLog} variant="outline">
          Clear Log
        </Button>
      </div>

      {/* Test Log */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Test Log</h3>
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 max-h-96 overflow-y-auto">
          {testLog.length === 0 ? (
            <p className="text-gray-500 italic">No log entries yet...</p>
          ) : (
            <div className="space-y-1">
              {testLog.map((entry, index) => (
                <div key={index} className="text-sm font-mono text-gray-700">
                  {entry}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventLoadTest;
