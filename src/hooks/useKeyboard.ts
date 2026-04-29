import { useEffect, useState } from 'react';

export const useKeyboard = () => {
  const [actions, setActions] = useState({
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    jump: false,
    shoot: false,
    interact: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': setActions((prev) => ({ ...prev, moveForward: true })); break;
        case 'KeyS': setActions((prev) => ({ ...prev, moveBackward: true })); break;
        case 'KeyA': setActions((prev) => ({ ...prev, moveLeft: true })); break;
        case 'KeyD': setActions((prev) => ({ ...prev, moveRight: true })); break;
        case 'Space': setActions((prev) => ({ ...prev, jump: true })); break;
        case 'KeyF': setActions((prev) => ({ ...prev, interact: true })); break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': setActions((prev) => ({ ...prev, moveForward: false })); break;
        case 'KeyS': setActions((prev) => ({ ...prev, moveBackward: false })); break;
        case 'KeyA': setActions((prev) => ({ ...prev, moveLeft: false })); break;
        case 'KeyD': setActions((prev) => ({ ...prev, moveRight: false })); break;
        case 'Space': setActions((prev) => ({ ...prev, jump: false })); break;
        case 'KeyF': setActions((prev) => ({ ...prev, interact: false })); break;
      }
    };

    const handleMouseDown = () => setActions((prev) => ({ ...prev, shoot: true }));
    const handleMouseUp = () => setActions((prev) => ({ ...prev, shoot: false }));

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return actions;
};
