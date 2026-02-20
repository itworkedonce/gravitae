// -----------------------------
// Gravitae Hook: useFrameDataApplier
// -----------------------------
// Custom hook que maneja la aplicación de datos de simulación a capas de After Effects

import { useEffect } from 'react';
import { useAppState } from '../context/AppStateContext';

/**
 * Hook para aplicar los datos de frames a las capas de After Effects
 * En esta versión básica, solo muestra una alerta con la cantidad de frames
 */
export const useFrameDataApplier = () => {
  const { 
    simulation: { frameData },
    physics: { simulationStatus }
  } = useAppState();

  // Efecto que se ejecuta cuando frameData cambia y la simulación está completa
  useEffect(() => {
    if (simulationStatus === 'completed' && frameData.length > 0) {
      // Versión básica: solo muestra una alerta con la cantidad de frames
      // alert(`FrameData contiene ${frameData.length} frames que pueden ser aplicados a las capas`);
      
    }
  }, [frameData, simulationStatus]);

  return {
    // En el futuro, aquí se expondrían métodos para aplicar los datos
    frameDataLength: frameData.length,
  };
};