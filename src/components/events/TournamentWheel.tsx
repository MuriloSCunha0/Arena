import React, { useState, useEffect, useRef } from 'react';
import { Participant, Court } from '../../types';
import { CornerDownLeft, Pause, PlayCircle, RotateCw, Trophy, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import confetti from 'canvas-confetti';

interface TournamentWheelProps {
  participants: Participant[];
  courts: Court[];
  onComplete: (matches: Array<[string, string]>, courtAssignments: Record<string, string>) => void;
  autoPlay?: boolean;
  speed?: number;
}

export const TournamentWheel: React.FC<TournamentWheelProps> = ({
  participants,
  courts,
  onComplete,
  autoPlay = true,
  speed = 1.2
}) => {
  const [spinning, setSpinning] = useState(false);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Array<[string, string]>>([]);
  const [currentPair, setCurrentPair] = useState<Participant[]>([]);
  const [courtAssignments, setCourtAssignments] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(false);
  const [step, setStep] = useState<'teams' | 'courts'>('teams');
  const [currentCourt, setCurrentCourt] = useState<Court | null>(null);
  const [processingStage, setProcessingStage] = useState(0); // 0: not started, 1: selecting participants, 2: selecting courts, 3: finished
  
  const wheelRef = useRef<HTMLDivElement>(null);
  const spinTimeout = useRef<NodeJS.Timeout | null>(null);
  const animationSpeed = useRef<number>(speed);
  const autoStartTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const colors = [
    '#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#FF9F1C', 
    '#6B48FF', '#EC4E20', '#00A8E8', '#8AFF80', '#D62828',
    '#3BCEAC', '#FFD166', '#EF476F', '#06D6A0', '#118AB2'
  ];
  
  // Adicionar efeitos sonoros
  const playTickSound = () => {
    try {
      const audio = new Audio('/sounds/tick.mp3');
      audio.volume = 0.3;
      audio.play();
    } catch (e) {
      console.log('Som não disponível');
    }
  };
  
  const playSuccessSound = () => {
    try {
      const audio = new Audio('/sounds/success.mp3');
      audio.volume = 0.5;
      audio.play();
    } catch (e) {
      console.log('Som não disponível');
    }
  };
  
  // Participantes disponíveis (não selecionados ainda)
  const availableParticipants = participants.filter(
    p => !selectedParticipants.includes(p)
  );
  
  // Quando o componente montar, iniciar automático se solicitado
  useEffect(() => {
    if (autoPlay) {
      autoStartTimeout.current = setTimeout(() => {
        startAutomaticProcess();
      }, 1000);
    }
    
    return () => {
      if (autoStartTimeout.current) clearTimeout(autoStartTimeout.current);
      if (spinTimeout.current) clearTimeout(spinTimeout.current);
    };
  }, [autoPlay]);
  
  // Função para iniciar o processo automático
  const startAutomaticProcess = () => {
    setProcessingStage(1);
    spinWheel();
  };
  
  // Função para girar a roleta
  const spinWheel = () => {
    if (spinning) return;
    
    setSpinning(true);
    playTickSound(); // Tocar som
    
    if (step === 'teams') {
      // Calcular duração da animação com base na velocidade
      const spinDuration = 3000 / animationSpeed.current;
      
      // Efeito visual da roleta girando - mais dinâmico
      if (wheelRef.current) {
        // Aumentar o número de rotações para um efeito mais dramático
        const rotations = Math.floor(Math.random() * 2 + 3) * 360; // 3-5 rotações completas
        const randomAngle = Math.floor(Math.random() * 360);
        const totalRotation = rotations + randomAngle;
        
        wheelRef.current.style.transition = `transform ${spinDuration/1000}s cubic-bezier(0.1, 0.8, 0.2, 1)`;
        wheelRef.current.style.transform = `rotate(${totalRotation}deg)`;
        wheelRef.current.classList.add('animate-pulse');
      }
      
      // Selecionar aleatoriamente
      const randomIndex = Math.floor(Math.random() * availableParticipants.length);
      const selectedParticipant = availableParticipants[randomIndex];
      setCurrentParticipant(selectedParticipant);
      
      // Após a duração da animação
      spinTimeout.current = setTimeout(() => {
        if (wheelRef.current) {
          wheelRef.current.classList.remove('animate-pulse');
        }
        
        // Adicionar o participante selecionado
        setSelectedParticipants(prev => [...prev, selectedParticipant]);
        playSuccessSound(); // Tocar som de sucesso
        
        // Atualizar o par atual
        setCurrentPair(prev => {
          const newPair = [...prev, selectedParticipant];
          
          // Quando tiver um par completo
          if (newPair.length === 2) {
            // Adicionar o match
            setMatches(prevMatches => [
              ...prevMatches, 
              [newPair[0].id, newPair[1].id]
            ]);
            
            // Resetar o par atual
            return [];
          }
          
          return newPair;
        });
        
        setSpinning(false);
        
        // Se ainda houver participantes para selecionar após esta seleção
        const remainingAfter = availableParticipants.length - 1;
        
        // Se todos os participantes já foram em pares, prosseguir para quadras
        if (remainingAfter <= 1 && currentPair.length === 0) {
          // Transição para seleção de quadras com efeito visual
          setTimeout(() => {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.6 }
            });
            setStep('courts');
            setProcessingStage(2);
            
            // Iniciar automaticamente a seleção de quadras após pequeno delay
            setTimeout(() => {
              spinWheel();
            }, 1000);
          }, 1000);
        } 
        // Se ainda tivermos pares para formar
        else if (processingStage === 1) {
          // Continuar automaticamente após pequeno delay
          setTimeout(() => {
            spinWheel();
          }, 800);
        }
      }, spinDuration);
    }
    else if (step === 'courts') {
      // Ainda há partidas sem quadras?
      const unassignedMatches = matches.filter(match => 
        !courtAssignments[`${match[0]}|${match[1]}`]
      );
      
      if (unassignedMatches.length === 0) {
        // Todas as quadras foram atribuídas
        setCompleted(true);
        setProcessingStage(3);
        
        // Disparar confetti para celebrar
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        
        // Chamar o callback de conclusão
        setTimeout(() => {
          onComplete(matches, courtAssignments);
        }, 1500);
        
        return;
      }
      
      // Calcular duração da animação
      const spinDuration = 2500 / animationSpeed.current;
      
      // Efeito visual da roleta girando
      if (wheelRef.current) {
        wheelRef.current.style.transition = `transform ${spinDuration/1000}s cubic-bezier(0.1, 0.7, 0.1, 1)`;
        wheelRef.current.style.transform = `rotate(${Math.random() * 1080 + 720}deg)`;
        wheelRef.current.classList.add('animate-pulse');
      }
      
      // Selecionar uma quadra aleatoriamente
      const randomCourtIndex = Math.floor(Math.random() * courts.length);
      const selectedCourt = courts[randomCourtIndex];
      setCurrentCourt(selectedCourt);
      
      // Selecionar uma partida aleatoriamente para atribuir esta quadra
      const randomMatchIndex = Math.floor(Math.random() * unassignedMatches.length);
      const selectedMatch = unassignedMatches[randomMatchIndex];
      
      // Após a duração da animação
      spinTimeout.current = setTimeout(() => {
        if (wheelRef.current) {
          wheelRef.current.classList.remove('animate-pulse');
        }
        
        // Atualizar atribuições de quadras
        setCourtAssignments(prev => ({
          ...prev,
          [`${selectedMatch[0]}|${selectedMatch[1]}`]: selectedCourt.id
        }));
        
        setSpinning(false);
        
        if (processingStage === 2) {
          // Continuar automaticamente após pequeno delay
          // Se ainda houver partidas sem quadra
          setTimeout(() => {
            spinWheel();
          }, 800);
        }
      }, spinDuration);
    }
  };
  
  // Função para finalizar manualmente
  const handleFinalize = () => {
    setCompleted(true);
    onComplete(matches, courtAssignments);
  };
  
  // Renderização da roleta
  return (
    <div className="space-y-6 text-center">
      <div className="mb-4">
        {step === 'teams' && (
          <h3 className="text-lg font-medium text-brand-purple mb-2">
            Sorteio de Duplas
          </h3>
        )}
        
        {step === 'courts' && !completed && (
          <h3 className="text-lg font-medium text-brand-green mb-2">
            Atribuição de Quadras
          </h3>
        )}
        
        {completed && (
          <h3 className="text-lg font-medium text-brand-blue mb-2">
            Sorteio Concluído!
          </h3>
        )}
        
        <p className="text-sm text-gray-600">
          {step === 'teams' && `Faltam ${availableParticipants.length} participantes`}
          {step === 'courts' && !completed && `${Object.keys(courtAssignments).length} de ${matches.length} partidas com quadras definidas`}
          {completed && 'Todas as duplas e quadras foram sorteadas!'}
        </p>
      </div>
      
      <div className="relative" style={{ height: '320px' }}>
        {/* Nova decoração pulsante em torno da roleta quando estiver girando */}
        {spinning && (
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <div className="w-72 h-72 rounded-full bg-gradient-to-r from-brand-green/30 to-brand-purple/30 animate-ping"></div>
          </div>
        )}
        
        {/* Indicador/Seta aprimorado */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-20">
          <div className="w-12 h-12 flex items-center justify-center">
            <div className="w-0 h-0 
              border-l-[12px] border-l-transparent 
              border-r-[12px] border-r-transparent 
              border-t-[18px] border-t-brand-purple
              filter drop-shadow-md"></div>
          </div>
        </div>
        
        {/* Roleta com design aprimorado */}
        <div className="relative z-10">
          {/* Anel externo decorativo */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full border-8 border-brand-blue/30 backdrop-blur-sm"></div>
          
          {/* Roleta principal */}
          <div 
            ref={wheelRef} 
            className="w-64 h-64 rounded-full mx-auto shadow-xl border-8 border-brand-blue relative overflow-hidden"
            style={{ 
              transition: 'transform 3s cubic-bezier(0.1, 0.8, 0.2, 1)',
              backgroundImage: `
                repeating-conic-gradient(
                  from 0deg, 
                  #FF6B6B 0deg 30deg, 
                  #4ECDC4 30deg 60deg, 
                  #FFD166 60deg 90deg, 
                  #06D6A0 90deg 120deg, 
                  #118AB2 120deg 150deg, 
                  #6B48FF 150deg 180deg, 
                  #FF9F1C 180deg 210deg, 
                  #1A535C 210deg 240deg, 
                  #FF6B6B 240deg 270deg, 
                  #EF476F 270deg 300deg, 
                  #EC4E20 300deg 330deg, 
                  #3BCEAC 330deg 360deg
                )
              `,
              boxShadow: '0 0 25px rgba(0,0,0,0.2), inset 0 0 10px rgba(255,255,255,0.2)'
            }}
          >
            {/* Divisores da roleta */}
            {Array(12).fill(0).map((_, i) => (
              <div 
                key={`divider-${i}`} 
                className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-white/30"
                style={{ 
                  transform: `translateX(-50%) rotate(${i * 30}deg)`,
                  transformOrigin: 'center bottom'
                }}
              />
            ))}

            {/* Participantes na roleta durante etapa de formação de duplas */}
            {step === 'teams' && availableParticipants.map((participant, index) => {
              // Calculamos o ângulo para posicionar cada participante uniformemente
              const angleStep = 360 / availableParticipants.length;
              const angle = index * angleStep;
              const rad = (angle - 90) * (Math.PI / 180); // -90 para começar do topo
              
              // Raio do círculo um pouco menor que o tamanho total para não tocar a borda
              const radius = 100;
              const x = radius * Math.cos(rad);
              const y = radius * Math.sin(rad);
              
              // Cor de destaque para cada participante
              const bgColor = colors[index % colors.length];
              
              return (
                <div 
                  key={participant.id}
                  className="absolute flex items-center justify-center bg-white rounded-full shadow-md w-16 h-16 transform -translate-x-1/2 -translate-y-1/2 border-2 transition-all duration-300 hover:scale-110"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    borderColor: bgColor,
                    backgroundColor: bgColor + '15', // Cor suave de fundo
                    boxShadow: `0 4px 8px rgba(0,0,0,0.1), 0 0 0 2px ${bgColor}40`
                  }}
                >
                  <div className="flex flex-col items-center">
                    {participant.name?.split(' ')[0]?.charAt(0).toUpperCase() && (
                      <span className="text-lg font-bold" style={{ color: bgColor }}>
                        {participant.name?.split(' ')[0]?.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="text-[10px] font-semibold text-center truncate w-14">
                      {participant.name?.split(' ')[0]}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {/* Quadras na roleta durante etapa de atribuição */}
            {step === 'courts' && courts.map((court, index) => {
              const angleStep = 360 / courts.length;
              const angle = index * angleStep;
              const rad = (angle - 90) * (Math.PI / 180);
              const radius = 100;
              const x = radius * Math.cos(rad);
              const y = radius * Math.sin(rad);
              
              // Cor para cada quadra
              const bgColor = colors[index % colors.length];
              
              return (
                <div 
                  key={court.id}
                  className="absolute flex items-center justify-center bg-white rounded-full shadow-md w-16 h-16 transform -translate-x-1/2 -translate-y-1/2 border-2 transition-all hover:scale-110"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    borderColor: bgColor,
                    backgroundColor: bgColor + '20', // Cor suave
                    boxShadow: `0 4px 8px rgba(0,0,0,0.1), 0 0 0 2px ${bgColor}40`
                  }}
                >
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xs font-semibold text-center truncate w-14" style={{ color: bgColor }}>
                      {court.name}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {/* Círculo central com resultado da seleção atual - mais elaborado */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="w-32 h-32 rounded-full backdrop-blur-sm flex items-center justify-center"
                   style={{ backgroundColor: 'rgba(255,255,255,0.9)', boxShadow: '0 0 20px rgba(0,0,0,0.15)' }}>
                <div className="w-24 h-24 bg-white rounded-full border-4 border-brand-blue flex items-center justify-center"
                     style={{ boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)' }}>
                  {spinning ? (
                    <div className="animate-pulse">
                      <RotateCw size={32} className="text-brand-blue animate-spin" />
                    </div>
                  ) : currentParticipant && step === 'teams' ? (
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-bold text-brand-purple">
                        {currentParticipant.name?.split(' ')[0]?.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm font-bold text-center text-brand-purple">
                        {currentParticipant.name?.split(' ')[0]}
                      </span>
                    </div>
                  ) : currentCourt && step === 'courts' ? (
                    <div className="flex flex-col items-center">
                      <MapPin size={16} className="text-brand-green mb-1" />
                      <span className="text-sm font-bold text-center text-brand-green">
                        {currentCourt.name}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      {processingStage === 0 ? (
                        <PlayCircle size={28} className="text-brand-blue mb-1" />
                      ) : (
                        <RotateCw size={28} className="text-brand-blue mb-1" />
                      )}
                      <span className="text-xs text-center text-gray-400">
                        {processingStage === 0 ? 'Iniciar' : 'Girar'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Resultados parciais - design melhorado */}
      <div className="mt-6">
        {step === 'teams' && currentPair.length > 0 && (
          <div className="bg-gradient-to-r from-brand-purple/20 to-brand-blue/20 p-4 rounded-lg inline-block shadow-sm border border-brand-purple/20">
            <p className="text-sm font-medium text-brand-purple flex items-center">
              <Trophy size={16} className="mr-2" />
              Formando dupla: <span className="font-bold mx-1">{currentPair[0].name?.split(' ')[0]}</span>
              {selectedParticipants.length % 2 === 1 ? ' + ...' : ''}
            </p>
          </div>
        )}
        
        {step === 'courts' && currentCourt && (
          <div className="bg-gradient-to-r from-brand-green/20 to-brand-blue/20 p-4 rounded-lg inline-block shadow-sm border border-brand-green/20">
            <p className="text-sm font-medium text-brand-green flex items-center">
              <MapPin size={16} className="mr-2" />
              Última atribuição: <span className="font-bold mx-1">{currentCourt.name}</span>
            </p>
          </div>
        )}
      </div>
      
      {/* Controles - mais atraentes */}
      <div className="mt-6 flex justify-center space-x-4">
        <Button
          variant={processingStage === 0 ? "primary" : "outline"}
          onClick={processingStage === 0 ? startAutomaticProcess : spinWheel}
          disabled={spinning || completed || (step === 'teams' && availableParticipants.length === 0)}
          className={`transition-all duration-300 ${spinning ? 'animate-pulse' : ''}`}
          style={{
            boxShadow: processingStage === 0 ? '0 4px 12px rgba(167,215,0,0.3)' : 'none'
          }}
        >
          {processingStage === 0 ? (
            <>
              <PlayCircle size={16} className="mr-1" /> Iniciar Sorteio
            </>
          ) : spinning ? (
            <>
              <Pause size={16} className="mr-1" /> Sorteando...
            </>
          ) : (
            <>
              <RotateCw size={16} className="mr-1" /> {step === 'teams' ? 'Girar Roleta' : 'Sortear Quadra'}
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          onClick={handleFinalize}
          disabled={spinning || completed || matches.length === 0}
        >
          <Check size={16} className="mr-1" /> Concluir
        </Button>
      </div>
      
      {/* Resumo das duplas formadas - design aprimorado */}
      {matches.length > 0 && (
        <div className="mt-8 text-left">
          <h4 className="text-md font-medium mb-3 text-brand-blue flex items-center">
            <Trophy size={18} className="mr-2 text-brand-gold" /> Duplas Formadas:
          </h4>
          <div className="max-h-48 overflow-y-auto bg-white rounded-lg border border-gray-200 divide-y shadow-inner">
            {matches.map((match, index) => {
              const p1 = participants.find(p => p.id === match[0]);
              const p2 = participants.find(p => p.id === match[1]);
              const courtId = courtAssignments[`${match[0]}|${match[1]}`];
              const court = courts.find(c => c.id === courtId);
              
              // Cor de fundo alternada para as linhas
              const bgColor = index % 2 === 0 ? 'bg-gray-50' : 'bg-white';
              
              return (
                <div key={index} className={`p-3 flex justify-between items-center ${bgColor} hover:bg-brand-green/5`}>
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue font-medium mr-2">
                      {index + 1}
                    </div>
                    <span className="font-medium">
                      {p1?.name?.split(' ')[0]} + {p2?.name?.split(' ')[0]}
                    </span>
                  </div>
                  {court && (
                    <span className="text-xs bg-brand-green/10 text-brand-green px-3 py-1 rounded-full border border-brand-green/20">
                      {court.name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Adicionar elemento decorativo no fundo para completar o visual */}
      {completed && (
        <div className="absolute inset-0 z-[-1] pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-brand-green/10 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-brand-purple/10 to-transparent"></div>
        </div>
      )}
    </div>
  );
};

// Adicionar esse componente para o ícone de Mapa com tipos definidos corretamente
function MapPin({ size, className }: { size?: number | string; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>
  );
}
