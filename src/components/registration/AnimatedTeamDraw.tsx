import React, { useState, useEffect } from 'react';
import { TeamFormationAnimation } from '../../types';
import { useSpring, animated, config } from 'react-spring';
import { Award, MapPin, Clock, Users } from 'lucide-react';
import { Button } from '../ui/Button';

interface AnimatedTeamDrawProps {
  animationData: TeamFormationAnimation;
  onComplete?: () => void;
  canExport?: boolean;
}

export const AnimatedTeamDraw: React.FC<AnimatedTeamDrawProps> = ({
  animationData,
  onComplete,
  canExport = false
}) => {
  const [currentStep, setCurrentStep] = useState<'teams' | 'matches' | 'complete'>('teams');
  const [displayedTeams, setDisplayedTeams] = useState<number[]>([]);
  const [displayedMatches, setDisplayedMatches] = useState<{courtId: string, matchIndex: number}[]>([]);
  
  const teamFade = useSpring({
    opacity: currentStep === 'teams' ? 1 : 0,
    transform: currentStep === 'teams' ? 'translateY(0%)' : 'translateY(-50%)',
    config: config.gentle
  });
  
  const matchesFade = useSpring({
    opacity: currentStep === 'matches' ? 1 : 0,
    transform: currentStep === 'matches' ? 'translateY(0%)' : 'translateY(50%)',
    config: config.gentle
  });
  
  // Display teams gradually
  useEffect(() => {
    if (currentStep === 'teams') {
      const timer = setInterval(() => {
        setDisplayedTeams(prev => {
          if (prev.length >= animationData.teams.length) {
            clearInterval(timer);
            // Move to matches after displaying all teams plus a delay
            setTimeout(() => setCurrentStep('matches'), 2000);
            return prev;
          }
          return [...prev, prev.length];
        });
      }, 800); // Delay between teams appearing
      
      return () => clearInterval(timer);
    }
  }, [currentStep, animationData.teams.length]);
  
  // Display matches gradually
  useEffect(() => {
    if (currentStep === 'matches') {
      let courtIndex = 0;
      let matchIndex = 0;
      let allDone = false;
      
      const timer = setInterval(() => {
        setDisplayedMatches(prev => {
          const court = animationData.courts[courtIndex];
          if (!court) {
            allDone = true;
            return prev;
          }
          
          if (matchIndex >= court.matches.length) {
            courtIndex++;
            matchIndex = 0;
            if (courtIndex >= animationData.courts.length) {
              allDone = true;
              return prev;
            }
            return [...prev, {courtId: animationData.courts[courtIndex].id, matchIndex}];
          } else {
            const result = [...prev, {courtId: court.id, matchIndex}];
            matchIndex++;
            return result;
          }
        });
        
        if (allDone) {
          clearInterval(timer);
          setTimeout(() => {
            setCurrentStep('complete');
            if (onComplete) onComplete();
          }, 2000);
        }
      }, 1200); // Delay between matches appearing
      
      return () => clearInterval(timer);
    }
  }, [currentStep, animationData.courts, onComplete]);
  
  // Get team by ID
  const getTeam = (teamId: string) => {
    return animationData.teams.find(team => team.id === teamId);
  }
  
  // Export animation as video (placeholder - in real implementation would use canvas capture API)
  const handleExport = () => {
    // This is a simplified placeholder - real implementation would require canvas recording
    alert("Exportando vídeo para compartilhamento no Instagram...");
    // In a real implementation, you would:
    // 1. Use something like RecordRTC or MediaRecorder API
    // 2. Capture the animation frames
    // 3. Generate a video file
    // 4. Provide download or direct sharing option
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-brand-blue">
          {currentStep === 'teams' ? 'Sorteio de Duplas' : 
           currentStep === 'matches' ? 'Chaveamento de Partidas' : 
           'Sorteio Finalizado'}
        </h2>
        
        {canExport && (
          <Button onClick={handleExport} size="sm" variant="outline">
            Exportar para Instagram
          </Button>
        )}
      </div>
      
      <div className="flex-grow relative overflow-hidden bg-gray-50 rounded-lg border border-gray-200">
        {/* Teams Formation Animation */}
        <animated.div style={teamFade} className="absolute inset-0 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedTeams.map(index => {
              const team = animationData.teams[index];
              if (!team) return null;
              
              return (
                <div 
                  key={team.id} 
                  className="bg-white rounded-lg shadow p-4 border-l-4 border-brand-green animate-fadeIn"
                >
                  <h3 className="font-medium text-brand-blue text-lg mb-3 flex items-center">
                    <Users className="mr-2" size={18} />
                    Dupla #{index + 1}
                  </h3>
                  <div className="space-y-3">
                    {team.members.map(member => (
                      <div key={member.id} className="flex items-center">
                        {member.avatarUrl ? (
                          <img 
                            src={member.avatarUrl} 
                            alt={member.name}
                            className="w-10 h-10 rounded-full mr-3" 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-brand-purple/20 text-brand-purple flex items-center justify-center mr-3">
                            {member.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-gray-700">{member.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </animated.div>
        
        {/* Matches Distribution Animation */}
        <animated.div style={matchesFade} className="absolute inset-0 p-6">
          <div className="space-y-8">
            {animationData.courts.map((court, courtIndex) => (
              <div key={court.id} className="bg-white rounded-lg shadow p-4">
                <h3 className="font-medium text-brand-blue text-lg mb-3 flex items-center">
                  <MapPin className="mr-2" size={18} />
                  {court.name}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {court.matches.map((match, matchIndex) => {
                    const isDisplayed = displayedMatches.some(
                      m => m.courtId === court.id && m.matchIndex >= matchIndex
                    );
                    
                    if (!isDisplayed) return null;
                    
                    const team1 = getTeam(match.team1Id);
                    const team2 = getTeam(match.team2Id);
                    
                    return (
                      <div 
                        key={match.id} 
                        className="border border-gray-200 rounded-lg p-3 animate-fadeIn"
                      >
                        <div className="flex justify-between items-center mb-2 text-sm">
                          <span className="text-brand-purple font-medium">Partida #{courtIndex + 1}-{matchIndex + 1}</span>
                          {match.scheduledTime && (
                            <span className="flex items-center text-gray-500">
                              <Clock size={14} className="mr-1" />
                              {new Date(match.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">
                              {team1 ? `Dupla #${animationData.teams.indexOf(team1) + 1}` : 'TBD'}
                            </div>
                            <div className="text-xs bg-gray-100 px-2 py-1 rounded">vs</div>
                            <div className="font-medium text-right">
                              {team2 ? `Dupla #${animationData.teams.indexOf(team2) + 1}` : 'TBD'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </animated.div>
        
        {/* Complete Message */}
        {currentStep === 'complete' && (
          <div className="flex flex-col items-center justify-center h-full">
            <Award size={48} className="text-brand-green mb-4" />
            <h3 className="text-xl font-bold text-brand-blue mb-2">Sorteio finalizado!</h3>
            <p className="text-gray-600 text-center max-w-md">
              Todas as duplas foram formadas e as partidas foram distribuídas entre as quadras.
              O torneio está pronto para começar!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnimatedTeamDraw;
