import React, { useState, useEffect, useRef } from 'react';
import styles from './LoadingOverlay.module.scss';

interface LoadingOverlayProps {
  isVisible: boolean;
  bodyCount?: number;
  currentStep?: string;
  progress?: number; // Direct progress value (0-100)
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible, bodyCount = 1, currentStep, progress: externalProgress }) => {
  const [progress, setProgress] = useState(0);
  const [targetProgress, setTargetProgress] = useState(0);
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number>(0);
  const isInitializedRef = useRef(false);

  // Use external progress as target, with fast interpolation for smooth UX
  useEffect(() => {
    if (externalProgress !== undefined) {
      setTargetProgress(Math.min(externalProgress, 100));
      return;
    }
  }, [externalProgress]);

  // Fast interpolation to target progress for smooth UX but accurate timing
  useEffect(() => {
    if (!isVisible || targetProgress <= 0) return;

    const interpolateProgress = () => {
      setProgress(currentProgress => {
        const diff = targetProgress - currentProgress;
        
        if (Math.abs(diff) < 0.1) {
          // Reached target, no micro-movement to avoid drift
          return targetProgress;
        }
        
        // Much faster interpolation to stay close to real progress
        return currentProgress + (diff * 0.3);
      });
      
      // Continue until we reach target
      if (Math.abs(progress - targetProgress) > 0.1) {
        animationRef.current = requestAnimationFrame(interpolateProgress);
      }
    };

    animationRef.current = requestAnimationFrame(interpolateProgress);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetProgress, isVisible, progress]);

  // Handle visibility changes
  useEffect(() => {
    if (!isVisible) {
      // Complete progress to 100% before hiding if we were showing progress
      if (progress > 0 && progress < 100) {
        setProgress(100);
        // Small delay before resetting to show completion
        setTimeout(() => {
          setProgress(0);
          setTargetProgress(0);
        }, 200);
      } else {
        setProgress(0);
        setTargetProgress(0);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    // Only use time-based estimation if no external progress is provided
    if (externalProgress === undefined) {
      // Start timing when overlay becomes visible
      startTimeRef.current = performance.now();
      
      const updateProgress = () => {
        const elapsed = performance.now() - startTimeRef.current;
        // Realistic scaling based on observed processing times
        let estimatedDuration;
        if (bodyCount <= 3) {
          estimatedDuration = 300 + (bodyCount * 100); // Small counts: ~400-600ms
        } else {
          estimatedDuration = 800 + (bodyCount * 150); // Larger counts: more aggressive scaling
        }
        // Cap maximum duration to prevent extremely long estimates
        estimatedDuration = Math.min(estimatedDuration, 6000);
        const newProgress = Math.min((elapsed / estimatedDuration) * 100, 98); // Cap at 98%
        
        setProgress(newProgress);
        
        // Continue updating until we hit the cap
        if (newProgress < 98) {
          animationRef.current = requestAnimationFrame(updateProgress);
        }
      };

      animationRef.current = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isVisible, bodyCount, externalProgress]);

  if (!isVisible) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <p className={styles.percentage}>{Math.round(progress)}/100%</p>
        {currentStep && <p className={styles.step}>{currentStep}</p>}
      </div>
    </div>
  );
};

export default LoadingOverlay;