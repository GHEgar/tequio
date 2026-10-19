import { useEffect, useState } from 'react';

export const useFps = (): number => {
    const [fps, setFps] = useState(0);
    useEffect(() => {
        let frames = 0;
        let since = performance.now();
        let frame = requestAnimationFrame(function count(now) {
            frames += 1;
            if (now - since >= 1000) {
                setFps(Math.round((frames * 1000) / (now - since)));
                frames = 0;
                since = now;
            }
            frame = requestAnimationFrame(count);
        });
        return () => cancelAnimationFrame(frame);
    }, []);
    return fps;
};
