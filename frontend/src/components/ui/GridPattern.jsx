const GridPattern = ({ className }) => {
  return (
    <div
      className={`absolute inset-0 pointer-events-none opacity-60 ${className || ''}`}
      style={{
        backgroundImage: `
          linear-gradient(hsl(var(--border) / 0.8) 1px, transparent 1px),
          linear-gradient(to right, hsl(var(--border) / 0.8) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
        maskImage: 'radial-gradient(ellipse at 50% 0%, white 20%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 0%, white 20%, transparent 70%)',
      }}
    />
  );
};

export default GridPattern;
