'use client';

import { useEffect, useRef } from 'react';
import { createNoise2D } from 'simplex-noise';

export default function TextureBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 크기 설정
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Simplex Noise 생성
    const noise2D = createNoise2D();
    const time = Date.now() * 0.0001;

    // 질감 그리기
    const drawTexture = () => {
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const data = imageData.data;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const index = (y * canvas.width + x) * 4;

          // 노이즈 값 생성 (0~1 범위)
          const scale = 0.05; // 질감 크기 조절
          const noiseValue = (noise2D(x * scale, y * scale) + 1) / 2; // -1~1을 0~1로 변환

          // 여러 레이어의 노이즈 결합 (더 복잡한 질감)
          const noise2 = (noise2D(x * scale * 2, y * scale * 2) + 1) / 2;
          const noise3 = (noise2D(x * scale * 0.5, y * scale * 0.5) + 1) / 2;
          const combinedNoise = (noiseValue * 0.5 + noise2 * 0.3 + noise3 * 0.2);

          // 검정색 기반에 노이즈 적용
          const baseR = 0;
          const baseG = 0;
          const baseB = 0;

          // 노이즈로 밝기 변화 (검정 배경용, 매우 미세한 변화)
          const variation = (combinedNoise - 0.5) * 15;
          
          data[index] = Math.max(0, Math.min(255, baseR + variation));     // R
          data[index + 1] = Math.max(0, Math.min(255, baseG + variation)); // G
          data[index + 2] = Math.max(0, Math.min(255, baseB + variation)); // B
          data[index + 3] = 255; // Alpha
        }
      }

      ctx.putImageData(imageData, 0, 0);
    };

    drawTexture();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ mixBlendMode: 'overlay', opacity: 0.3 }}
    />
  );
}

