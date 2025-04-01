'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useTheme } from '@/context/ThemeContext';
import { motion } from 'framer-motion';
import { 
  ZoomIn, ZoomOut, ArrowLeft, ArrowRight,
  PanelRight, X, Save, Pencil, Eraser,
  AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';

// Worker for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;

interface PDFViewerProps {
  pdfUrl: string;
  onClose: () => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfUrl, onClose }) => {
  const { theme } = useTheme();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [notesAlignment, setNotesAlignment] = useState<string>('right');
  const [pageLoaded, setPageLoaded] = useState<boolean>(false);
  // Drawing states
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [drawingColor, setDrawingColor] = useState<string>('#000000');
  const [drawingWidth, setDrawingWidth] = useState<number>(3); // زيادة سمك الخط الافتراضي
  const [isEraser, setIsEraser] = useState<boolean>(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Document load handlers
  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }

  function onDocumentLoadError(error: Error) {
    console.error('خطأ في تحميل ملف PDF:', error);
    setError(`حدث خطأ أثناء تحميل الملف: ${error.message}`);
    setLoading(false);
  }
  
  // Page load handler
  function onPageLoadSuccess() {
    setPageLoaded(true);
  }

  // Navigation
  const goToPreviousPage = () => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = Math.max(prevPageNumber - 1, 1);
      setPageLoaded(false);
      return newPageNumber;
    });
  };

  const goToNextPage = () => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = Math.min(prevPageNumber + 1, numPages || 1);
      setPageLoaded(false);
      return newPageNumber;
    });
  };

  // Zoom controls
  const zoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.2, 3));
  };

  const zoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
  };

  // Notes handling
  const saveNotes = () => {
    try {
      const noteData = {
        pageNumber,
        notes,
        timestamp: new Date().toISOString()
      };
      
      const pdfName = pdfUrl.split('/').pop() || 'document';
      const key = `notes_${pdfName}_page${pageNumber}`;
      localStorage.setItem(key, JSON.stringify(noteData));
      
      alert('تم حفظ الملاحظات بنجاح!');
    } catch (err) {
      console.error('Error saving notes:', err);
    }
  };

  const loadNotes = () => {
    try {
      const pdfName = pdfUrl.split('/').pop() || 'document';
      const key = `notes_${pdfName}_page${pageNumber}`;
      const savedNotes = localStorage.getItem(key);
      
      if (savedNotes) {
        const noteData = JSON.parse(savedNotes);
        setNotes(noteData.notes || '');
      } else {
        setNotes('');
      }
    } catch (err) {
      console.error('Error loading notes:', err);
    }
  };

  useEffect(() => {
    if (pageLoaded) {
      initializeCanvas();
      loadNotes();
    }
  }, [pageNumber, pageLoaded, pdfUrl, scale]);

  const handleAlignmentChange = (alignment: string) => {
    setNotesAlignment(alignment);
    
    if (textareaRef.current) {
      textareaRef.current.style.textAlign = alignment;
    }
  };

  // Drawing functions
  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;

    const pdfContainer = document.querySelector('.pdf-container');
    if (!pdfContainer) return;

    const containerRect = pdfContainer.getBoundingClientRect();
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;

    // تحسين جودة الخط
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = drawingColor;
    context.lineWidth = drawingWidth;
    
    // تمهيد الخطوط
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    
    contextRef.current = context;
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    
    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    lastPoint.current = { x, y };
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawingMode || !lastPoint.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (isEraser) {
      // وظيفة المحو المحسنة
      const eraserSize = drawingWidth * 5;
      contextRef.current.globalCompositeOperation = 'destination-out';
      contextRef.current.beginPath();
      contextRef.current.arc(x, y, eraserSize, 0, Math.PI * 2);
      contextRef.current.fill();
      contextRef.current.globalCompositeOperation = 'source-over';
    } else {
      // وظيفة الرسم المحسنة مع التنعيم
      contextRef.current.beginPath();
      contextRef.current.moveTo(lastPoint.current.x, lastPoint.current.y);
      
      // إضافة نقطة وسيطة للحصول على خط أكثر انسيابية
      const midPoint = {
        x: (lastPoint.current.x + x) / 2,
        y: (lastPoint.current.y + y) / 2
      };
      
      contextRef.current.quadraticCurveTo(
        lastPoint.current.x,
        lastPoint.current.y,
        midPoint.x,
        midPoint.y
      );
      
      contextRef.current.stroke();
    }
    
    lastPoint.current = { x, y };
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    if (contextRef.current) {
      contextRef.current.closePath();
    }
    lastPoint.current = null;
    setIsDrawing(false);
  };

  const toggleDrawingMode = () => {
    setIsDrawingMode(!isDrawingMode);
    setIsEraser(false);
    if (contextRef.current) {
      contextRef.current.strokeStyle = drawingColor;
      contextRef.current.globalCompositeOperation = 'source-over';
    }
  };

  const toggleEraser = () => {
    setIsEraser(!isEraser);
    setIsDrawingMode(true);
    if (contextRef.current) {
      contextRef.current.globalCompositeOperation = isEraser ? 'source-over' : 'destination-out';
    }
  };

  return (
    <div className={`fixed inset-0 z-50 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} overflow-hidden flex flex-col`}>
      {/* PDF viewer header */}
      <div className={`flex items-center justify-between px-4 py-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
          onClick={onClose}
        >
          <ArrowLeft size={20} className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} />
        </motion.button>
        
        <div className="flex space-x-2 rtl:space-x-reverse">
          <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            صفحة {pageNumber} من {numPages || '...'}
          </span>
          <div className="flex space-x-1 rtl:space-x-reverse">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} ${pageNumber <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={goToPreviousPage}
              disabled={pageNumber <= 1}
            >
              <ArrowRight size={18} className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} ${pageNumber >= (numPages || 1) ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={goToNextPage}
              disabled={pageNumber >= (numPages || 1)}
            >
              <ArrowLeft size={18} className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} />
            </motion.button>
          </div>
        </div>

        <div className="flex space-x-2 rtl:space-x-reverse">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`p-2 rounded ${
              isDrawingMode 
                ? theme === 'dark' ? 'bg-gray-700 text-emerald-400' : 'bg-gray-200 text-emerald-600'
                : theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-200'
            }`}
            onClick={toggleDrawingMode}
            title={isDrawingMode ? "إيقاف الرسم" : "تفعيل الرسم"}
          >
            <Pencil size={20} />
          </motion.button>
          
          {isDrawingMode && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded ${
                isEraser
                  ? theme === 'dark' ? 'bg-gray-700 text-emerald-400' : 'bg-gray-200 text-emerald-600'
                  : theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-200'
              }`}
              onClick={toggleEraser}
              title={isEraser ? "العودة إلى القلم" : "استخدام الممحاة"}
            >
              <Eraser size={20} />
            </motion.button>
          )}

          {isDrawingMode && !isEraser && (
            <>
              <input
                type="color"
                value={drawingColor}
                onChange={(e) => {
                  setDrawingColor(e.target.value);
                  if (contextRef.current) {
                    contextRef.current.strokeStyle = e.target.value;
                  }
                }}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <input
                type="range"
                min="1"
                max="10"
                value={drawingWidth}
                onChange={(e) => {
                  const newWidth = parseInt(e.target.value);
                  setDrawingWidth(newWidth);
                  if (contextRef.current) {
                    contextRef.current.lineWidth = newWidth;
                  }
                }}
                className="w-20 h-8 mx-2"
                title="سمك الخط"
              />
            </>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`p-2 rounded ${
            showNotes 
              ? theme === 'dark' ? 'bg-gray-700 text-emerald-400' : 'bg-gray-200 text-emerald-600'
              : theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setShowNotes(!showNotes)}
          title={showNotes ? "إخفاء المذكرات" : "إظهار المذكرات"}
        >
          <PanelRight size={20} />
        </motion.button>
      </div>
      
      <div className="flex-1 overflow-hidden relative flex">
        {/* Loading indicator */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
            <div className="rounded-lg bg-white p-4 shadow-lg flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
              <p className="mt-2 text-gray-700">جاري تحميل الملف...</p>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
            <div className="rounded-lg bg-white p-4 shadow-lg flex flex-col items-center max-w-md mx-auto text-center">
              <p className="text-red-500 mb-2">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        )}
      
        <div className={`flex-1 ${showNotes ? 'w-3/4' : 'w-full'} overflow-auto transition-all duration-300 ease-in-out`}>
          <div className="relative h-full w-full flex justify-center">
            <div className="pdf-container" style={{ transform: `scale(${scale})`, transformOrigin: 'center top' }}>
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center h-40 w-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                  </div>
                }
                className="flex justify-center"
              >
                {numPages !== null && numPages > 0 && (
                  <div className="relative">
                    <Page 
                      pageNumber={pageNumber} 
                      renderTextLayer={false} 
                      renderAnnotationLayer={false}
                      onLoadSuccess={onPageLoadSuccess}
                      className="pdf-page"
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute top-0 left-0 w-full h-full"
                      style={{ 
                        pointerEvents: isDrawingMode ? 'auto' : 'none',
                        cursor: isDrawingMode ? (isEraser ? 'crosshair' : 'pointer') : 'default'
                      }}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                    />
                  </div>
                )}
              </Document>
            </div>
          </div>
        </div>
        
        {/* Notes panel */}
        {showNotes && (
          <div 
            className={`h-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} overflow-auto flex flex-col border-l ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
            } transition-all duration-300 ease-in-out w-1/4 min-w-[250px]`}
          >
            <div className={`p-3 flex items-center justify-between border-b ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h3 className={`font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                ملاحظات الصفحة {pageNumber}
              </h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-1 rounded-full"
                onClick={() => setShowNotes(false)}
              >
                <X size={18} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
              </motion.button>
            </div>
            
            <div className={`flex items-center gap-1 p-2 border-b ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
            }`}>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`p-1.5 rounded ${notesAlignment === 'right' ? (theme === 'dark' ? 'bg-gray-700 text-emerald-400' : 'bg-gray-200 text-emerald-600') : ''}`}
                onClick={() => handleAlignmentChange('right')}
              >
                <AlignRight size={16} />
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`p-1.5 rounded ${notesAlignment === 'center' ? (theme === 'dark' ? 'bg-gray-700 text-emerald-400' : 'bg-gray-200 text-emerald-600') : ''}`}
                onClick={() => handleAlignmentChange('center')}
              >
                <AlignCenter size={16} />
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`p-1.5 rounded ${notesAlignment === 'left' ? (theme === 'dark' ? 'bg-gray-700 text-emerald-400' : 'bg-gray-200 text-emerald-600') : ''}`}
                onClick={() => handleAlignmentChange('left')}
              >
                <AlignLeft size={16} />
              </motion.button>
              
              <div className="flex-1"></div>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`p-1.5 rounded flex items-center gap-1 ${
                  theme === 'dark' ? 'bg-emerald-700 hover:bg-emerald-600 text-white' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
                }`}
                onClick={saveNotes}
              >
                <Save size={16} />
                <span className="text-xs">حفظ</span>
              </motion.button>
            </div>
            
            <textarea
              ref={textareaRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`flex-1 p-3 resize-none outline-none w-full text-right ${
                theme === 'dark' 
                  ? 'bg-gray-800 text-gray-100 placeholder-gray-500' 
                  : 'bg-white text-gray-800 placeholder-gray-400'
              } border-none`}
              placeholder="اكتب ملاحظاتك هنا..."
              style={{ textAlign: notesAlignment }}
              dir="rtl"
            />
          </div>
        )}
      </div>
      
      {/* Simple controls - only zoom */}
      <div 
        className={`p-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-inner flex items-center justify-center gap-1`}
      >
        <div className="flex space-x-1 rtl:space-x-reverse">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`p-2 rounded ${
              theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-200'
            }`}
            onClick={zoomIn}
          >
            <ZoomIn size={20} />
          </motion.button>
          <span className={`flex items-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            {Math.round(scale * 100)}%
          </span>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`p-2 rounded ${
              theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-200'
            }`}
            onClick={zoomOut}
          >
            <ZoomOut size={20} />
          </motion.button>
        </div>
      </div>
      
      <style jsx global>{`
        .react-pdf__Document {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .react-pdf__Page {
          margin: 10px;
          box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
          position: relative;
          background-color: white;
        }
        
        .react-pdf__Page canvas {
          display: block;
          user-select: none;
        }

        canvas {
          touch-action: none;
        }
      `}</style>
    </div>
  );
};

export default PDFViewer;


