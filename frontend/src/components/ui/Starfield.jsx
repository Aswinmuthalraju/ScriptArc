import { useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';

const Starfield = () => {
    const canvasRef = useRef(null);
    const { theme } = useTheme();
    const animRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const isLight = theme === 'light';
        const COUNT = isLight ? 45 : 80;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const particles = Array.from({ length: COUNT }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            r: isLight ? Math.random() * 1.8 + 0.4 : Math.random() * 1.2 + 0.2,
            baseOpacity: isLight ? Math.random() * 0.10 + 0.03 : Math.random() * 0.4 + 0.1,
            speedY: isLight ? Math.random() * 0.25 + 0.08 : 0,
            driftX: (Math.random() - 0.5) * 0.06,
            phase: Math.random() * Math.PI * 2,
            pulseSpeed: Math.random() * 0.008 + 0.003,
        }));

        let frame = 0;

        const draw = () => {
            frame += 0.01;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p) => {
                if (isLight) {
                    // Light mode: blue particles drifting downward
                    p.y += p.speedY;
                    p.x += p.driftX;
                    if (p.y > canvas.height + 5) {
                        p.y = -5;
                        p.x = Math.random() * canvas.width;
                    }
                    if (p.x < 0) p.x = canvas.width;
                    if (p.x > canvas.width) p.x = 0;
                    const pulse = 0.6 + 0.4 * Math.sin(frame * 3 + p.phase);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(96, 165, 250, ${p.baseOpacity * pulse})`;
                    ctx.fill();
                } else {
                    // Dark mode: white stars with horizontal drift + twinkle
                    p.x += p.driftX;
                    if (p.x < 0) p.x = canvas.width;
                    if (p.x > canvas.width) p.x = 0;
                    const opacity = p.baseOpacity * (0.5 + 0.5 * Math.sin(frame * (p.pulseSpeed / 0.005) + p.phase));
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(226, 232, 240, ${opacity})`;
                    ctx.fill();
                }
            });

            animRef.current = requestAnimationFrame(draw);
        };

        animRef.current = requestAnimationFrame(draw);

        return () => {
            window.removeEventListener('resize', resize);
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [theme]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 0,
                pointerEvents: 'none',
                opacity: theme === 'light' ? 0.85 : 0.7,
            }}
        />
    );
};

export default Starfield;
