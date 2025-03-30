"use client";
import { useRef, useState, useEffect } from 'react';

interface LessonViewerProps {
  lessonUrl: string;
}

// Quick colors for easy access
const quickColors = [
  '#000000', // Black
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
];

export default function LessonViewer({ lessonUrl }: LessonViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfViewerRef = useRef<HTMLObjectElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | null>(null);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [fileLoaded, setFileLoaded] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const ctx = useRef<CanvasRenderingContext2D | null>(null);

  const initializeCanvas = () => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    // Set canvas width to container width
    canvas.width = container.clientWidth;

    // Set canvas height to match content height or minimum container height
    const height = Math.max(contentHeight || container.clientHeight, container.clientHeight);
    canvas.height = height;

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

      // Save current drawing
      const imageData = ctx.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);

      // Resize canvas to match new dimensions
      const newHeight = Math.max(contentHeight || containerRef.current.clientHeight, containerRef.current.clientHeight);
      canvasRef.current.width = containerRef.current.clientWidth;
      canvasRef.current.height = newHeight;

      // Restore context properties
      ctx.current.lineCap = 'round';
      ctx.current.lineJoin = 'round';
      ctx.current.strokeStyle = color;
      ctx.current.lineWidth = brushSize;

      // Restore drawing
      ctx.current.putImageData(imageData, 0, 0);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [contentHeight]);

  // Monitor PDF content for full height
  useEffect(() => {
    if (!pdfViewerRef.current || !containerRef.current) return;

    const pdfViewer = pdfViewerRef.current;

    // Function to handle PDF load
    const handlePdfLoad = () => {
      setFileLoaded(true);

      // Set a default height for PDF viewer
      const containerHeight = containerRef.current?.clientHeight || 800;
      setContentHeight(containerHeight);

      if (canvasRef.current) {
        canvasRef.current.height = containerHeight;
      }
    };

    pdfViewer.onload = handlePdfLoad;

    return () => {
      if (pdfViewerRef.current) {
        pdfViewerRef.current.onload = null;
      }
    };
  }, []);

  const drawFreehand = (e: MouseEvent | TouchEvent) => {
    if (!ctx.current || !canvasRef.current || !isDrawing) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top + containerRef.current!.scrollTop;

    if (lastPos.current) {
      ctx.current.beginPath();
      ctx.current.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.current.lineTo(x, y);
      ctx.current.stroke();
    }

    lastPos.current = { x, y };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!currentTool || !ctx.current || !canvasRef.current) return;
    setIsDrawing(true);

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top + containerRef.current!.scrollTop;

    lastPos.current = { x, y };
  };

  const stopDrawing = () => {
    if (!ctx.current || !canvasRef.current) return;
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

  const toggleToolbar = () => {
    setToolbarVisible(!toolbarVisible);
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
      {/* Toggle Toolbar Button */}
      <button
        onClick={toggleToolbar}
        className="bg-gray-800/90 backdrop-blur-sm p-2 absolute top-4 left-4 rounded-lg shadow-lg z-20 hover:bg-gray-700/90 transition-all duration-200"
        title={toolbarVisible ? "إخفاء شريط الأدوات" : "إظهار شريط الأدوات"}
      >
        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {toolbarVisible ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          )}
        </svg>
      </button>

      {/* Drawing Tools Toolbar */}
      {toolbarVisible && (
        <div className="bg-gray-800/90 backdrop-blur-sm p-3 flex items-center gap-3 absolute top-4 left-16 rounded-lg shadow-lg z-10">
          {/* Drawing Tools */}
          <div className="flex items-center gap-2">
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          <div className="h-6 w-px bg-gray-600"></div>

          {/* Quick Colors */}
          <div className="flex items-center gap-1.5">
            {quickColors.map((colorValue) => (
              <button
                key={colorValue}
                onClick={() => setColor(colorValue)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  color === colorValue ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: colorValue }}
                title={`لون ${colorValue}`}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-2 border-white/20"
              title="اختيار لون مخصص"
            />
          </div>

          {/* Line Width */}
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
            <input
              type="range"
              min="1"
              max="30"
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
      )}

      {/* Canvas Container */}
      <div 
        className="relative flex-1 overflow-auto custom-scrollbar" 
        ref={contentRef}
        style={{ 
          minHeight: '300px'
        }}
      >
        <div
          className="relative"
          style={{
            minHeight: '100%',
            minWidth: '100%',
            height: contentHeight > 0 ? `${contentHeight}px` : '100%'
          }}
        >
          {!fileLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-3"></div>
                <p className="text-gray-700 font-medium">جاري تحميل الملف...</p>
              </div>
            </div>
          )}
          
          {/* PDF Viewer using object tag */}
          <object
            ref={pdfViewerRef}
            data={lessonUrl}
            type="application/pdf"
            className={`w-full ${fileLoaded ? 'block' : 'opacity-0'}`}
            style={{
              height: contentHeight > 0 ? `${contentHeight}px` : '100%',
            }}
          >
            <p className="text-center p-4 bg-gray-100 rounded-lg border border-gray-300 m-4">
              يبدو أن متصفحك لا يدعم عرض ملفات PDF بشكل مباشر. 
              <a href={lessonUrl} className="text-blue-600 hover:underline mx-2" target="_blank" rel="noopener noreferrer">
                اضغط هنا لتحميل الملف
              </a>
            </p>
          </object>
          
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={(e) => drawFreehand(e.nativeEvent)}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={(e) => drawFreehand(e.nativeEvent)}
            onTouchEnd={stopDrawing}
            className="absolute inset-0 w-full touch-none"
            style={{
              backgroundColor: 'transparent',
              cursor: currentTool === 'pen' ? 'crosshair' :
                currentTool === 'eraser' ? 'not-allowed' :
                  'default',
              height: contentHeight > 0 ? `${contentHeight}px` : '100%',
              pointerEvents: currentTool ? 'auto' : 'none'
            }}
          />
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 6px;
          border: 2px solid rgba(255, 255, 255, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  );
}