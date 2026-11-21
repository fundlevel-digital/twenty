import { useEffect, useRef } from 'react';

type OnMountEffectProps = {
  onMount: () => void;
};

export const OnMountEffect = ({ onMount }: OnMountEffectProps) => {
  const initialOnMount = useRef(onMount);
  useEffect(() => {
    initialOnMount.current();
  }, []);

  return null;
};
