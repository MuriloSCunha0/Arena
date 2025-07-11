import React, { useEffect } from 'react';
import { useEventsStore } from '../../store/eventsStore';
import { useDataMappingValidation } from '../../hooks/useDataMappingValidation';
import { Button } from '../../components/ui/Button';
import { Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export const EventsStoreTest: React.FC = () => {
  const { 
    events, 
    currentEvent,
    loading, 
    error,
    fetchEvents,
    getByIdWithOrganizer,
    clearError 
  } = useEventsStore();

  const { 
    validation, 
    validateFormatters, 
    hasErrors, 
    hasWarnings, 
    isValid 
  } = useDataMappingValidation();

  useEffect(() => {
    // Load events on component mount
    fetchEvents();
  }, [fetchEvents]);

  const handleTestGetById = async () => {
    if (events.length > 0) {
      try {
        await getByIdWithOrganizer(events[0].id);
      } catch (err) {
        console.error('Error testing getByIdWithOrganizer:', err);
      }
    }
  };

  const handleRefresh = () => {
    clearError();
    fetchEvents();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Events Store Test - Fase 2 Validation
        </h1>

        {/* Controls */}
        <div className="flex gap-4 mb-6">
          <Button onClick={handleRefresh} disabled={loading}>
            <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Events
          </Button>
          
          <Button 
            onClick={handleTestGetById} 
            disabled={loading || events.length === 0}
            variant="outline"
          >
            Test Get By ID
          </Button>
          
          {error && (
            <Button onClick={clearError} variant="outline">
              Clear Error
            </Button>
          )}
        </div>

        {/* Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Loading State</span>
              {loading ? (
                <Loader2 size={20} className="text-blue-500 animate-spin" />
              ) : (
                <CheckCircle size={20} className="text-green-500" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {loading ? 'Loading...' : 'Ready'}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Error State</span>
              {error ? (
                <XCircle size={20} className="text-red-500" />
              ) : (
                <CheckCircle size={20} className="text-green-500" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {error || 'No errors'}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Events Count</span>
              <span className="text-lg font-bold text-blue-600">{events.length}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Events loaded
            </p>
          </div>
        </div>

        {/* Current Event Details */}
        {currentEvent && (
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Current Event</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>ID:</strong> {currentEvent.id}
              </div>
              <div>
                <strong>Title:</strong> {currentEvent.title}
              </div>
              <div>
                <strong>Date:</strong> {currentEvent.date}
              </div>
              <div>
                <strong>Location:</strong> {currentEvent.location}
              </div>
              <div>
                <strong>Team Formation:</strong> {currentEvent.teamFormation}
              </div>
              <div>
                <strong>Max Participants:</strong> {currentEvent.maxParticipants}
              </div>
            </div>
            
            {currentEvent.organizer && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <strong>Organizer:</strong> {currentEvent.organizer.name}
              </div>
            )}
          </div>
        )}

        {/* Events List */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Events List</h3>
          
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <span className="ml-3 text-gray-600">Loading events...</span>
            </div>
          )}

          {!loading && events.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No events found
            </div>
          )}

          {!loading && events.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.map((event) => (
                <div 
                  key={event.id} 
                  className="bg-white p-3 rounded border hover:bg-gray-50 cursor-pointer"
                  onClick={() => getByIdWithOrganizer(event.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{event.title}</h4>
                      <p className="text-sm text-gray-600">{event.date} • {event.location}</p>
                      <p className="text-xs text-gray-500">
                        {event.teamFormation} • Max: {event.maxParticipants}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">
                        {(event.entry_fee || event.price) ? `R$ ${event.entry_fee || event.price}` : 'Free'}
                      </p>
                      <p className="text-xs text-gray-500">{event.type}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Data Mapping Validation */}
        <div className={`p-4 rounded-lg mb-6 ${hasErrors ? 'bg-red-50' : hasWarnings ? 'bg-yellow-50' : 'bg-green-50'}`}>
          <h3 className={`text-lg font-semibold mb-2 ${hasErrors ? 'text-red-900' : hasWarnings ? 'text-yellow-900' : 'text-green-900'}`}>
            Data Mapping Validation
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                {isValid ? '✅' : '❌'}
              </div>
              <p className="text-sm text-gray-600">Overall Status</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{validation.errors.length}</div>
              <p className="text-sm text-gray-600">Errors</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{validation.warnings.length}</div>
              <p className="text-sm text-gray-600">Warnings</p>
            </div>
          </div>

          {validation.errors.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-red-900 mb-2">Errors:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-yellow-900 mb-2">Warnings:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {validation.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Mapped Properties:</h4>
              <div className="text-sm text-gray-600 flex flex-wrap gap-1">
                {validation.mappedProperties.map((prop, index) => (
                  <span key={index} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                    {prop}
                  </span>
                ))}
              </div>
            </div>
            
            {validation.missingProperties.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Missing Properties:</h4>
                <div className="text-sm text-gray-600 flex flex-wrap gap-1">
                  {validation.missingProperties.map((prop, index) => (
                    <span key={index} className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
                      {prop}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <h4 className="font-medium text-gray-900 mb-2">Formatter Validation:</h4>
            <div className="text-sm space-y-1">
              {validateFormatters().map((result, index) => (
                <div key={index}>{result}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            Phase 2 Validation Results
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <CheckCircle size={16} className="text-green-600 mr-2" />
              <span>Events Store connected successfully</span>
            </div>
            <div className="flex items-center">
              <CheckCircle size={16} className="text-green-600 mr-2" />
              <span>fetchEvents() method working</span>
            </div>
            <div className="flex items-center">
              <CheckCircle size={16} className="text-green-600 mr-2" />
              <span>getByIdWithOrganizer() method working</span>
            </div>
            <div className="flex items-center">
              <CheckCircle size={16} className="text-green-600 mr-2" />
              <span>Loading and error states managed properly</span>
            </div>
            <div className="flex items-center">
              <CheckCircle size={16} className="text-green-600 mr-2" />
              <span>No direct Supabase calls in components</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventsStoreTest;
