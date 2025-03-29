"use client";
import { useRef, useState, useEffect } from 'react';

interface LessonViewerProps {
  lessonUrl: string;
}

export default function LessonViewer({ lessonUrl }: LessonViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | null>(null);
  const [color, setColor] = useState('#FF0000');
  const [brushSize, setBrushSize] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const ctx = useRef<CanvasRenderingContext2D | null>(null);

  const initializeCanvas = () => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    // Set canvas size to match container
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Get and store context
    const context = canvas.getContext('2d');
    if (context) {
      ctx.current = context;
      ctx.current.lineCap = 'round';
      ctx.current.lineJoin = 'round';
      ctx.current.strokeStyle = color;
      ctx.current.lineWidth = brushSize;
    }
  };

  useEffect(() => {
    initializeCanvas();
    
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current || !ctx.current) return;
      
      // Store the current image data
      const imageData = ctx.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Resize canvas
      canvasRef.current.width = containerRef.current.clientWidth;
      canvasRef.current.height = containerRef.current.clientHeight;
      
      // Restore context properties
      ctx.current.lineCap = 'round';
      ctx.current.lineJoin = 'round';
      ctx.current.strokeStyle = color;
      ctx.current.lineWidth = brushSize;
      
      // Restore the image
      ctx.current.putImageData(imageData, 0, 0);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!ctx.current) return;
    ctx.current.strokeStyle = currentTool === 'eraser' ? '#FFFFFF' : color;
    ctx.current.lineWidth = currentTool === 'eraser' ? brushSize * 2 : brushSize;
  }, [currentTool, color, brushSize]);

  const draw = (e: MouseEvent | TouchEvent) => {
    if (!ctx.current || !canvasRef.current || !isDrawing) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

    if (lastPos.current) {
      ctx.current.beginPath();
      ctx.current.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.current.lineTo(x, y);
      ctx.current.stroke();
    }

    lastPos.current = { x, y };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!currentTool) return;
    setIsDrawing(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;
    lastPos.current = { x, y };
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  const clearCanvas = () => {
    if (!ctx.current || !canvasRef.current) return;
    ctx.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`flex flex-col ${isFullscreen ? 'h-screen' : 'h-full'} bg-white relative transition-all duration-300`}
    >
      {/* Toolbar */}
      <div className="bg-gray-800/90 backdrop-blur-sm p-3 flex items-center gap-3 absolute top-4 left-1/2 transform -translate-x-1/2 rounded-lg shadow-lg z-10">
        <button
          onClick={() => setCurrentTool(currentTool === 'pen' ? null : 'pen')}
          className={`p-2 rounded-lg transition-all duration-200 ${
            currentTool === 'pen' 
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50' 
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
          title="قلم"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>

        <button
          onClick={() => setCurrentTool(currentTool === 'eraser' ? null : 'eraser')}
          className={`p-2 rounded-lg transition-all duration-200 ${
            currentTool === 'eraser'
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
          title="ممحاة"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="h-6 w-px bg-gray-600"></div>

        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-2 border-white/20"
          title="لون القلم"
        />

        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-24 accent-blue-500"
            title="حجم القلم"
          />
        </div>

        <div className="h-6 w-px bg-gray-600"></div>

        <button
          onClick={clearCanvas}
          className="p-2 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 transition-all duration-200"
          title="مسح الكل"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>

        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 transition-all duration-200"
          title={isFullscreen ? "إنهاء ملء الشاشة" : "ملء الشاشة"}
        >
          {isFullscreen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0l5 5m-5-5v4m16-4l-5 5m5-5v4M4 20l5-5m-5 5v-4m16 4l-5-5m5 5v-4" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0 0l-5-5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>
      </div>

      {/* Canvas Container */}
      <div className="relative flex-1">
        <iframe
          src={lessonUrl}
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: currentTool ? 'none' : 'auto' }}
        />
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={(e) => draw(e.nativeEvent)}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={(e) => draw(e.nativeEvent)}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 w-full h-full touch-none"
          style={{ 
            backgroundColor: 'transparent',
            cursor: currentTool === 'pen' ? 'crosshair' : currentTool === 'eraser' ? 'not-allowed' : 'default'
          }}
        />
      </div>
    </div>
  );
}