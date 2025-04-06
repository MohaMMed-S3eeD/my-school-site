'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useTheme } from '@/context/ThemeContext';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  ZoomIn, ZoomOut, ArrowLeft, ArrowRight,
  PanelRight, X, Save, Pencil, Eraser,
  AlignLeft, AlignCenter, AlignRight, Highlighter,
  Minus, RectangleHorizontal, Circle, Square, PaintBucket,
  Undo, Redo, PanelLeftOpen,
  Download, Maximize, Minimize,
  Brush, Palette, Trash2, ArrowUpRight
} from 'lucide-react';

// Worker for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;

interface PDFViewerProps {
  pdfUrl: string;
  onClose: () => void;
}

const QUICK_COLORS = [
    '#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#F97316', '#0EA5E9', '#FFFFFF'
]; 

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfUrl, onClose }) => {
  const { theme } = useTheme();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [notesAlignment, setNotesAlignment] = useState<'left' | 'center' | 'right'>('right');
  const [pageLoaded, setPageLoaded] = useState<boolean>(false);
  // Drawing states
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [drawingColor, setDrawingColor] = useState<string>('#000000');
  const [drawingWidth, setDrawingWidth] = useState<number>(3);
  const [currentTool, setCurrentTool] = useState<'pen' | 'highlighter' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'arrow' | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [drawingSnapshot, setDrawingSnapshot] = useState<ImageData | null>(null);
  const [isShapeFilled, setIsShapeFilled] = useState<boolean>(false);
  const [isToolPaletteOpen, setIsToolPaletteOpen] = useState<boolean>(false);
  // Undo/Redo, Thumbnails, Download states
  const [drawingHistory, setDrawingHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1); 
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false); 
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null); // Ref for fullscreen target
  const MAX_HISTORY_SIZE = 30; 

  // --- Fullscreen Logic --- 
  const toggleFullscreen = async () => {
    const elem = viewerContainerRef.current;
    if (!elem) return;

    if (!document.fullscreenElement) {
      try {
        await elem.requestFullscreen();
      } catch (err) {
        if (err instanceof Error) {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            alert(`لا يمكن الدخول لوضع ملء الشاشة: ${err.message}`);
        } else {
            console.error('An unknown error occurred while enabling full-screen mode:', err);
            alert('حدث خطأ غير معروف أثناء محاولة تفعيل وضع ملء الشاشة.');
        }
      }
    } else {
      if (document.exitFullscreen) {
        try {
          await document.exitFullscreen();
        } catch (err) {
           if (err instanceof Error) {
               console.error(`Error attempting to exit full-screen mode: ${err.message} (${err.name})`);
           } else {
               console.error('An unknown error occurred while exiting full-screen mode:', err);
           }
        }
      }
    }
  };

  // Effect to listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    // Also handle vendor prefixes if necessary (though less common now)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // --- Other Functions (Load, Nav, Notes, Draw, History, Download) --- 
  // Document load handlers
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('خطأ في تحميل ملف PDF:', error);
    setError(`حدث خطأ أثناء تحميل الملف: ${error.message}`);
    setLoading(false);
  }, []);
  
  // Page load handler
  const onPageLoadSuccess = useCallback(() => {
    setPageLoaded(true);
  }, []);

  // Navigation
  const goToPreviousPage = useCallback(() => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = Math.max(prevPageNumber - 1, 1);
      setPageLoaded(false);
      return newPageNumber;
    });
  }, []);

  const goToNextPage = useCallback(() => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = Math.min(prevPageNumber + 1, numPages || 1);
      setPageLoaded(false);
      return newPageNumber;
    });
  }, [numPages]);

  // Go to specific page
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= (numPages || 1)) {
        setPageNumber(page);
        setPageLoaded(false);
    }
  }, [numPages]);

  // Notes handling
  const saveNotes = useCallback(() => {
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
  }, [notes, pageNumber, pdfUrl]);

  const loadNotes = useCallback(() => {
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
      setNotes(''); // Reset notes on error
    }
  }, [pageNumber, pdfUrl]);

  const handleAlignmentChange = useCallback((alignment: 'left' | 'center' | 'right') => {
    setNotesAlignment(alignment);
    if (textareaRef.current) {
      textareaRef.current.style.textAlign = alignment;
    }
  }, []);

  // Tool and Drawing Mode
  const toggleDrawingMode = useCallback(() => {
    setIsDrawingMode(prev => !prev);
    // If entering drawing mode without a tool, select pen
    if (!isDrawingMode && currentTool === null) { 
        setCurrentTool('pen');
    }
    // If exiting drawing mode, deselect tool?
    // else if (isDrawingMode) { setCurrentTool(null); } 
  }, [isDrawingMode, currentTool]);

  const deselectTool = useCallback(() => {
      setCurrentTool(null);
      setIsDrawingMode(false);
  }, []);

  // Apply canvas context settings
  const applyCurrentToolSettings = useCallback(() => {
    const context = contextRef.current;
    if (!context) return;

    // General settings
    context.globalCompositeOperation = 'source-over';
    context.lineWidth = drawingWidth; 
    context.strokeStyle = drawingColor;
    context.fillStyle = drawingColor; 
    context.lineCap = 'round'; 
    context.lineJoin = 'round'; 

    // Tool specifics
    switch (currentTool) {
      case 'highlighter':
        const hex = drawingColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        context.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.4)`; 
        context.lineCap = 'butt'; 
        context.lineJoin = 'miter'; 
        context.lineWidth = Math.max(15, drawingWidth * 2); 
        break;
      case 'eraser':
        context.lineCap = 'round';
        context.lineJoin = 'round';
        break;
      case 'line':
         context.lineCap = 'round'; 
         context.lineJoin = 'round';
        break;
      case 'arrow':
        context.lineCap = 'round';
        context.lineJoin = 'round';
        break;
      case 'rectangle':
      case 'circle':
         context.lineCap = 'butt'; 
         context.lineJoin = 'miter';
        break;
      case 'pen':
      default:
        context.lineCap = 'round';
        context.lineJoin = 'round';
        break;
    }
  }, [drawingColor, drawingWidth, currentTool]);

  // --- Helper Function to Draw Arrow --- 
  const drawArrow = useCallback((context: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
      const headLength = Math.min(20, Math.max(10, drawingWidth * 3)); // Arrow head size based on line width
      const angle = Math.atan2(toY - fromY, toX - fromX);

      // Draw the line
      context.beginPath();
      context.moveTo(fromX, fromY);
      context.lineTo(toX, toY);
      context.stroke();

      // Draw the arrowhead
      context.beginPath();
      context.moveTo(toX, toY);
      context.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
      context.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
      context.closePath(); // Close the arrowhead path
      context.fillStyle = context.strokeStyle; // Use the current drawing color for fill
      context.fill(); // Fill the arrowhead
  }, [drawingWidth]); // Added drawingWidth dependency

  // --- Save/Load/Restore Drawing History --- 
  
  // Define saveDrawing *before* undo and redo
  const saveDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setTimeout(() => {
        try {
            const drawingDataUrl = canvas.toDataURL(); 
            const pdfName = pdfUrl.split('/').pop() || 'document';
            const key = `drawing_${pdfName}_page${pageNumber}`;
            localStorage.setItem(key, drawingDataUrl);
            // console.log(`Drawing saved for page ${pageNumber}`);
        } catch (err) {
            console.error('Error saving drawing:', err);
            if (err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22)) {
                alert('فشل حفظ الرسم: مساحة التخزين المحلية ممتلئة.');
            } else {
                alert('حدث خطأ غير متوقع أثناء حفظ الرسم.');
            }
        }
    }, 50); 
  }, [pageNumber, pdfUrl]);

  // Now define saveHistory, restoreHistory, undo, redo which might depend on saveDrawing
  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    try {
      const currentImageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const nextHistory = drawingHistory.slice(0, historyIndex + 1); 
      if (nextHistory.length >= MAX_HISTORY_SIZE) {
        nextHistory.shift(); 
      }
      nextHistory.push(currentImageData);
      setDrawingHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
    } catch (err) {
        console.error("Error saving history:", err);
    }
  }, [drawingHistory, historyIndex]);

  const restoreHistory = useCallback((index: number) => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context || index < 0 || index >= drawingHistory.length) return;

    try {
        const imageDataToRestore = drawingHistory[index];
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = canvas.width / dpr;
        const logicalHeight = canvas.height / dpr;
        context.clearRect(0, 0, logicalWidth, logicalHeight); 
        context.putImageData(imageDataToRestore, 0, 0);
        applyCurrentToolSettings(); 
    } catch(err) {
        console.error("Error restoring history:", err);
    }
  }, [drawingHistory, applyCurrentToolSettings]);
  
  const undo = useCallback(() => {
    let newIndex = -1;
    if (historyIndex > 0) { 
        newIndex = historyIndex - 1;
        restoreHistory(newIndex);
    } else if (historyIndex === 0) { // Undoing the first drawing
        const canvas = canvasRef.current;
        const context = contextRef.current;
        if(canvas && context) {
            const dpr = window.devicePixelRatio || 1;
            const logicalWidth = canvas.width / dpr;
            const logicalHeight = canvas.height / dpr;
            context.clearRect(0, 0, logicalWidth, logicalHeight);
            newIndex = -1; // Mark as initial state
        }
    } else { return; } // Already at initial state

    setHistoryIndex(newIndex);
    saveDrawing(); // Save the potentially blank state after undo

  }, [historyIndex, restoreHistory, saveDrawing]); // saveDrawing is now defined above

  const redo = useCallback(() => {
    if (historyIndex < drawingHistory.length - 1) {
      const newIndex = historyIndex + 1;
      restoreHistory(newIndex);
      setHistoryIndex(newIndex);
       saveDrawing();
    }
  }, [historyIndex, drawingHistory.length, restoreHistory, saveDrawing]); // saveDrawing is now defined above
  
  const saveInitialHistory = useCallback(() => {
      const canvas = canvasRef.current;
      const context = contextRef.current;
      if (!canvas || !context) return;
      try {
          // Ensure canvas is clear before capturing initial state if no drawing exists
          const dpr = window.devicePixelRatio || 1;
          const logicalWidth = canvas.width / dpr;
          const logicalHeight = canvas.height / dpr;
          // This clearRect might be redundant if loadDrawing clears first, but safe
          // context.clearRect(0, 0, logicalWidth, logicalHeight);
          
          const initialImageData = context.getImageData(0, 0, canvas.width, canvas.height);
          setDrawingHistory([initialImageData]);
          setHistoryIndex(0);
          console.log("Saved initial history state.")
      } catch (err) {
          console.error("Error saving initial history:", err);
          setDrawingHistory([]);
          setHistoryIndex(-1);
      }
  }, []); // No dependencies needed here, relies on canvas state

  const loadDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    
    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = canvas.width / dpr;
    const logicalHeight = canvas.height / dpr;

    setDrawingHistory([]);
    setHistoryIndex(-1);

    try {
      const pdfName = pdfUrl.split('/').pop() || 'document';
      const key = `drawing_${pdfName}_page${pageNumber}`;
      const savedDrawing = localStorage.getItem(key);

      context.clearRect(0, 0, logicalWidth, logicalHeight);

      if (savedDrawing) {
        const img = new Image();
        img.onload = () => {
          context.drawImage(img, 0, 0, logicalWidth, logicalHeight);
          console.log(`Drawing loaded for page ${pageNumber}`);
          applyCurrentToolSettings(); 
          saveInitialHistory();
        };
        img.onerror = (err) => { 
            console.error('Error loading saved drawing image:', err); 
            localStorage.removeItem(key); 
            saveInitialHistory(); // Save blank state if load fails
        }
        img.src = savedDrawing;
      } else {
         saveInitialHistory();
      }
    } catch (err) { 
        console.error('Error reading drawing from localStorage:', err); 
        saveInitialHistory(); 
    }
  }, [pageNumber, pdfUrl, applyCurrentToolSettings, saveInitialHistory]);

  // Drawing Initialization and Core Logic
  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;

    const pdfContainer = document.querySelector('.pdf-container');
    const pageElement = pdfContainer?.querySelector('.react-pdf__Page');

    if (!pageElement) {
        setTimeout(initializeCanvas, 100); 
        return;
    }

    const pageRect = pageElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = pageRect.width * dpr;
    canvas.height = pageRect.height * dpr;
    canvas.style.width = `${pageRect.width}px`;
    canvas.style.height = `${pageRect.height}px`;
    context.scale(dpr, dpr);

    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    
    contextRef.current = context;
    
    loadDrawing(); 
    applyCurrentToolSettings(); 
  }, [loadDrawing, applyCurrentToolSettings]);

  // --- Drawing Logic: Combined Mouse & Touch ---

  // Helper to get coordinates from mouse or touch event
  const getCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): { x: number, y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) { // Touch event
        if (e.touches.length > 0) {
            // Use touches for touchstart and touchmove
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            // Use changedTouches for touchend/touchcancel
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            return null; // No touch information available
        }
    } else { // Mouse event
        clientX = e.clientX;
        clientY = e.clientY;
    }

    if (clientX === undefined || clientY === undefined) return null;

    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const context = contextRef.current;
    const canvas = canvasRef.current;
    if (!currentTool || !context || !canvas || isDrawing) return; 

    const coords = getCoords(e);
    if (!coords) return;

    if ('touches' in e) { // Prevent scroll on touch start
        e.preventDefault();
    }

    setIsDrawing(true);
    setIsDrawingMode(true); // Ensure drawing mode is active

    setStartPoint(coords);
    lastPoint.current = coords; // Initialize last point
    applyCurrentToolSettings(); // Apply initial settings

    if (currentTool === 'pen' || currentTool === 'highlighter' || currentTool === 'eraser') {
      context.beginPath();
      context.moveTo(coords.x, coords.y);
    } else if (currentTool === 'line' || currentTool === 'rectangle' || currentTool === 'circle' || currentTool === 'arrow') {
      if(drawingSnapshot) setDrawingSnapshot(null); // Clear previous snapshot
      try { 
        setDrawingSnapshot(context.getImageData(0, 0, canvas.width, canvas.height));
      } catch (error) {
          console.error("Error getting snapshot:", error);
          setDrawingSnapshot(null);
      }
    }
  }, [currentTool, isDrawing, applyCurrentToolSettings, drawingSnapshot]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentTool || !contextRef.current) return;
    
    const coords = getCoords(e);
    if (!coords) return;

    if ('touches' in e) { // Prevent scroll on touch move while drawing
        e.preventDefault();
    }

    const context = contextRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = coords;

    if (currentTool === 'eraser') {
      if (!lastPoint.current) return; 
      const eraserSize = drawingWidth * 3; 
      context.globalCompositeOperation = 'destination-out';
      context.lineWidth = eraserSize; 
      context.beginPath(); 
      context.moveTo(lastPoint.current.x, lastPoint.current.y); 
      context.lineTo(x, y); 
      context.stroke(); 
      lastPoint.current = { x, y }; 
      context.globalCompositeOperation = 'source-over'; 
      context.lineWidth = drawingWidth; 
      applyCurrentToolSettings(); // Re-apply original tool settings

    } else if (currentTool === 'pen' || currentTool === 'highlighter') {
      if (!lastPoint.current) return; // Need a last point
      const midX = (lastPoint.current.x + x) / 2;
      const midY = (lastPoint.current.y + y) / 2;
      // Use quadratic curve for smoother lines
      context.quadraticCurveTo(lastPoint.current.x, lastPoint.current.y, midX, midY);
      context.stroke(); 
      context.beginPath(); // Start new path segment for the next part
      context.moveTo(midX, midY); // Move to the midpoint for the next segment
      lastPoint.current = { x, y }; 

    } else if ((currentTool === 'line' || currentTool === 'rectangle' || currentTool === 'circle' || currentTool === 'arrow') && drawingSnapshot && startPoint) {
      context.putImageData(drawingSnapshot, 0, 0); // Restore snapshot
      context.beginPath(); 
      applyCurrentToolSettings(); // Apply current settings (color, width)
      if (currentTool === 'line') { context.moveTo(startPoint.x, startPoint.y); context.lineTo(x, y); }
      else if (currentTool === 'rectangle') { context.rect(startPoint.x, startPoint.y, x - startPoint.x, y - startPoint.y); }
      else if (currentTool === 'circle') { const r = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2)); context.arc(startPoint.x, startPoint.y, r, 0, Math.PI * 2); }
      else if (currentTool === 'arrow') { drawArrow(context, startPoint.x, startPoint.y, x, y); }
      
      if (isShapeFilled && (currentTool === 'rectangle' || currentTool === 'circle')) {
          context.fillStyle = context.strokeStyle; // Use stroke color for fill
          context.fill();
      }
      context.stroke();
      // Do not update lastPoint here for shapes, only update on stopDrawing/mouseUp/touchEnd
    }
  }, [isDrawing, currentTool, drawingWidth, applyCurrentToolSettings, drawingSnapshot, startPoint, isShapeFilled, drawArrow]);

  const stopDrawing = useCallback((e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current) return; 
    
    const context = contextRef.current;
    const canvas = canvasRef.current;
    setIsDrawing(false); // Mark drawing as stopped

    if (!canvas) return;

    // Finalize Drawing Path for shapes if needed
    if ((currentTool === 'line' || currentTool === 'rectangle' || currentTool === 'circle' || currentTool === 'arrow') && drawingSnapshot && startPoint) {
        let finalCoords = lastPoint.current; // Initialize with the last point during drag
        // Try to get more precise coordinates from the stop event (MouseUp/TouchEnd)
        if (e) {
            const coordsFromEvent = getCoords(e);
            if (coordsFromEvent) {
                 finalCoords = coordsFromEvent;
                 lastPoint.current = finalCoords;
            }
        }

        if (finalCoords) {
            context.putImageData(drawingSnapshot, 0, 0); // Restore original state before drawing the final shape
            context.beginPath();
            applyCurrentToolSettings();
            const finalX = finalCoords.x;
            const finalY = finalCoords.y;

            if (currentTool === 'line') { context.moveTo(startPoint.x, startPoint.y); context.lineTo(finalX, finalY); }
            else if (currentTool === 'rectangle') { context.rect(startPoint.x, startPoint.y, finalX - startPoint.x, finalY - startPoint.y); }
            else if (currentTool === 'circle') { const r = Math.sqrt(Math.pow(finalX - startPoint.x, 2) + Math.pow(finalY - startPoint.y, 2)); context.arc(startPoint.x, startPoint.y, r, 0, Math.PI * 2); }
            else if (currentTool === 'arrow') { drawArrow(context, startPoint.x, startPoint.y, finalX, finalY); }
            
            if (isShapeFilled && (currentTool === 'rectangle' || currentTool === 'circle')) {
                context.fillStyle = context.strokeStyle;
                context.fill();
            }
            context.stroke();
        }
    } else if (currentTool === 'pen' || currentTool === 'highlighter' || currentTool === 'eraser') {
       context.closePath();
       context.globalCompositeOperation = 'source-over';
    }

    saveHistory();
    saveDrawing();

    lastPoint.current = null;
    setStartPoint(null);
    setDrawingSnapshot(null);
  }, [isDrawing, currentTool, drawingSnapshot, startPoint, applyCurrentToolSettings, isShapeFilled, saveHistory, saveDrawing, drawArrow]);

  // Download Logic
  const capturePageAsImage = useCallback(async (pageToCapture: number): Promise<string | null> => {
    console.log(`Navigating to page ${pageToCapture} for capture...`);
    setPageNumber(pageToCapture);
    setPageLoaded(false);

    await new Promise<void>((resolve) => {
        let attempts = 0;
        const maxAttempts = 50; 
        const checkPageLoad = () => {
            if (pageLoaded && canvasRef.current?.getContext('2d')) {
                 console.log(`Page ${pageToCapture} loaded.`);
                 setTimeout(resolve, 300); 
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkPageLoad, 100); 
            } else {
                console.warn(`Timeout waiting for page ${pageToCapture} to load for capture.`);
                resolve(); 
            }
        };
         setTimeout(checkPageLoad, 100); 
    });

    console.log(`Capturing page ${pageToCapture}...`);
    const pageElementContainer = document.querySelector(`.pdf-display-area .pdf-container .relative`); 

    if (!pageElementContainer) {
      console.error(`Could not find page container element for page ${pageToCapture} to capture.`);
      return null;
    }

    try {
      const canvas = await html2canvas(pageElementContainer as HTMLElement, {
        useCORS: true, 
        scale: window.devicePixelRatio * 1.5, 
        logging: false, 
        backgroundColor: null, 
        removeContainer: true 
      });
      console.log(`Page ${pageToCapture} captured.`);
      return canvas.toDataURL('image/png', 0.95); 
    } catch (error) {
      console.error(`Error capturing page ${pageToCapture} with html2canvas:`, error);
      return null;
    }
  }, [pageLoaded]); // Dependency on pageLoaded to re-evaluate the promise logic

  const downloadPdfWithDrawings = useCallback(async () => {
    if (!numPages || isDownloading) return;

    setIsDownloading(true);
    const originalPage = pageNumber; 
    let pdf: jsPDF | null = null;

    try {
      console.log('Starting PDF download process...');

      for (let i = 1; i <= numPages; i++) {
        const imageDataUrl = await capturePageAsImage(i);

        if (imageDataUrl) {
          const img = new Image();
          img.src = imageDataUrl;
          await new Promise(resolve => { img.onload = resolve }); 

          const imgWidth = img.naturalWidth;
          const imgHeight = img.naturalHeight;
          const pdfPageWidth = imgWidth; 
          const pdfPageHeight = imgHeight;

          if (i === 1) {
            pdf = new jsPDF({
              orientation: pdfPageWidth > pdfPageHeight ? 'l' : 'p',
              unit: 'px',
              format: [pdfPageWidth, pdfPageHeight],
              hotfixes: ["px_scaling"] 
            });
            console.log(`Initialized PDF. Adding page 1 (${imgWidth}x${imgHeight}px)`);
            pdf.addImage(imageDataUrl, 'PNG', 0, 0, pdfPageWidth, pdfPageHeight);
          } else if (pdf) {
             console.log(`Adding page ${i} (${imgWidth}x${imgHeight}px) to PDF.`);
            pdf.addPage([pdfPageWidth, pdfPageHeight], pdfPageWidth > pdfPageHeight ? 'l' : 'p');
            pdf.addImage(imageDataUrl, 'PNG', 0, 0, pdfPageWidth, pdfPageHeight);
          }
        } else {
           console.warn(`Skipping page ${i} due to capture error.`);
           if(pdf && i > 1) pdf.addPage(); 
        }
      }

      if (pdf) {
        const pdfName = pdfUrl.split('/').pop()?.replace(/\.pdf$/i, '') || 'document'; 
        console.log('Saving PDF...');
        pdf.save(`${pdfName}_with_drawings.pdf`);
      } else {
         console.error("PDF generation failed.");
         alert("فشل إنشاء ملف PDF.");
      }

    } catch (error) {
       console.error("Error during PDF download process:", error);
       alert("حدث خطأ أثناء عملية تحميل PDF.");
    } finally {
      console.log(`Restoring view to page ${originalPage}`);
      if (pageNumber !== originalPage) {
         setPageNumber(originalPage);
         setPageLoaded(false); 
      } else {
          initializeCanvas(); 
      }
      setIsDownloading(false);
      console.log('PDF download process finished.');
    }
  }, [numPages, isDownloading, pageNumber, pdfUrl, capturePageAsImage, initializeCanvas]);

  // --- Clear Drawings Logic ---
  const clearCurrentPageDrawings = () => {
    if (!window.confirm("هل أنت متأكد أنك تريد مسح جميع الرسومات في هذه الصفحة؟ لا يمكن التراجع عن هذا الإجراء.")) {
      return;
    }

    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    // 1. Clear the canvas visually
    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = canvas.width / dpr;
    const logicalHeight = canvas.height / dpr;
    context.clearRect(0, 0, logicalWidth, logicalHeight);

    // 2. Remove from localStorage
    try {
        const pdfName = pdfUrl.split('/').pop() || 'document';
        const key = `drawing_${pdfName}_page${pageNumber}`;
        localStorage.removeItem(key);
        console.log(`Cleared drawings from localStorage for page ${pageNumber}`);
    } catch (err) {
        console.error("Error removing drawing from localStorage:", err);
    }

    // 3. Reset drawing history to a blank initial state
    try {
        const blankImageData = context.getImageData(0, 0, canvas.width, canvas.height);
        setDrawingHistory([blankImageData]);
        setHistoryIndex(0); // Set history index to the new blank state
        console.log("Reset drawing history after clearing page.");
    } catch (err) {
        console.error("Error saving blank history after clearing:", err);
        setDrawingHistory([]); // Fallback to empty history
        setHistoryIndex(-1);
    }
    
    // Optional: Re-apply tool settings if needed (though canvas is blank)
    // applyCurrentToolSettings(); 
  };

  // --- Effects --- 
  // Initialize canvas on page load or scale change
  useEffect(() => {
    if (pageLoaded) {
      // No timeout needed now, as scale prop change triggers re-render
      console.log("Re-initializing canvas due to page load or scale change.");
      initializeCanvas(); 
    }
  }, [pageLoaded, scale, initializeCanvas]); // Keep scale dependency

  // Load notes when page changes
  useEffect(() => {
    if (pageLoaded) { // Also ensure notes are loaded after page is ready
        loadNotes();
    }
  }, [pageNumber, pageLoaded, loadNotes]); // Added loadNotes dependency

  // Apply tool settings when tool/color/width/fill changes
  useEffect(() => {
    applyCurrentToolSettings();
  }, [drawingColor, drawingWidth, currentTool, isShapeFilled, applyCurrentToolSettings]); // Added applyCurrentToolSettings

  // --- UI Calculations --- 
  const fileName = pdfUrl.split('/').pop()?.replace(/\.pdf$/i, '') || 'Document';

  const mainAreaWidthClass = () => {
      let width = 'w-full';
      if (showThumbnails && showNotes) width = 'w-1/2'; 
      else if (showThumbnails || showNotes) width = 'w-3/4'; 
      return width;
  }
  
  // --- Render --- 
  return (
    <div 
      ref={viewerContainerRef} 
      className={`fixed inset-0 z-50 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} overflow-hidden flex flex-col`}
    >
      {/* --- Header --- */} 
      <div className={`flex items-center justify-between px-2 py-1 md:px-4 md:py-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-md flex-shrink-0`}>
        
        {/* Left Section: Close, Thumbnails, Page Navigation */} 
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
            onClick={onClose}
            title="إغلاق"
          >
            <X size={20} className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} />
          </motion.button>
          {numPages && numPages > 1 && ( 
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`p-2 rounded ${showThumbnails ? (theme === 'dark' ? 'bg-gray-700 text-emerald-400' : 'bg-gray-200 text-emerald-600') : (theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-200')}`}
                onClick={() => setShowThumbnails(!showThumbnails)}
                title={showThumbnails ? "إخفاء المصغرات" : "إظهار المصغرات"}
            >
                <PanelLeftOpen size={20} />
            </motion.button>
          )}
          {numPages && numPages > 0 && (
                 <div className="flex items-center space-x-1 rtl:space-x-reverse ml-2">
                     <motion.button
                         whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                         className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} ${pageNumber <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                         onClick={goToPreviousPage}
                         disabled={pageNumber <= 1}
                         title="الصفحة السابقة"
                     >
                         <ArrowRight size={16} className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} />
                     </motion.button>
                     <span className={`text-xs md:text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}> 
                         {pageNumber} / {numPages}
                     </span>
                     <motion.button
                         whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                         className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} ${pageNumber >= numPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                         onClick={goToNextPage}
                         disabled={pageNumber >= numPages}
                         title="الصفحة التالية"
                     >
                         <ArrowLeft size={16} className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} />
                     </motion.button>
                 </div>
            )}
        </div>

        {/* Center Section: Filename */} 
        <div className="flex-1 flex justify-center items-center mx-2 overflow-hidden">
             <span 
                className={`text-sm md:text-base font-medium truncate ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`} 
                title={fileName}
            >
                 {fileName}
             </span>
        </div>

        {/* Right Section: Notes Only */} 
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className={`p-2 rounded ${showNotes ? (theme === 'dark' ? 'bg-gray-700 text-emerald-400' : 'bg-gray-200 text-emerald-600') : (theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-200')}`}
              onClick={() => setShowNotes(!showNotes)}
              title={showNotes ? "إخفاء الملاحظات" : "إظهار الملاحظات"}
            >
              <PanelRight size={20} />
            </motion.button>
        </div>
      </div>

      {/* --- Main Content Area --- */} 
      <div className="flex-1 overflow-hidden relative flex">
         {/* Thumbnail Sidebar */} 
         {showThumbnails && numPages && numPages > 0 && (
             <div 
                 className={`h-full ${theme === 'dark' ? 'bg-gray-800 border-r border-gray-700' : 'bg-gray-50 border-r border-gray-300'} 
                            overflow-y-auto transition-all duration-300 ease-in-out w-1/4 min-w-[150px] p-2 space-y-2 scrollbar-thin ${theme === 'dark' ? 'scrollbar-thumb-gray-600 scrollbar-track-gray-800' : 'scrollbar-thumb-gray-400 scrollbar-track-gray-100'}`}
             >
                 {Array.from(new Array(numPages), (el, index) => (
                     <motion.div
                         key={`thumb-${index + 1}`}
                         whileHover={{ scale: 1.03, borderColor: theme === 'dark' ? '#34d399' : '#10b981' }} 
                         className={`cursor-pointer border-2 ${ pageNumber === index + 1 ? (theme === 'dark' ? 'border-emerald-500' : 'border-emerald-600') : (theme === 'dark' ? 'border-gray-700' : 'border-gray-300') } 
                                     rounded overflow-hidden shadow-sm hover:shadow-md`}
                         onClick={() => goToPage(index + 1)}
                         title={`Go to page ${index + 1}`}
                     >
                         <Document
                             file={pdfUrl}
                             loading={<div className="h-24 bg-gray-200 dark:bg-gray-700 animate-pulse"></div>}
                             error={<div className="h-24 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 flex items-center justify-center text-xs">Error</div>}
                             className="flex justify-center items-center"
                          >
                             <Page 
                                 pageNumber={index + 1} 
                                 width={120} 
                                 renderTextLayer={false} 
                                 renderAnnotationLayer={false} 
                                 className="react-pdf__Page_thumbnail" 
                             />
                         </Document>
                      </motion.div>
                  ))}
             </div>
         )}
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
                  <button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600">إعادة المحاولة</button>
                </div>
             </div>
         )}
          {/* PDF Display Area */} 
         <div className={`flex-1 ${mainAreaWidthClass()} overflow-auto transition-all duration-300 ease-in-out pdf-display-area`}>
           <div className="relative h-full w-full flex justify-center items-start pt-4">
             <div 
                 className="pdf-container" 
                 style={{ 
                     width: 'max-content' 
                 }}
              >
               <Document
                 file={pdfUrl}
                 onLoadSuccess={onDocumentLoadSuccess}
                 onLoadError={onDocumentLoadError}
                 loading={<div className="flex items-center justify-center h-40 w-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>}
                 className="flex justify-center"
               >
                 {numPages !== null && numPages > 0 && (
                   <div className="relative"> 
                     <Page 
                       pageNumber={pageNumber} 
                       renderTextLayer={false} 
                       renderAnnotationLayer={false}
                       onLoadSuccess={onPageLoadSuccess}
                       className="pdf-page shadow-lg" 
                       scale={scale}
                       key={`page-${pageNumber}`}
                     />
                     <canvas
                       ref={canvasRef}
                       key={`canvas-${pageNumber}`}
                       className="absolute"
                       style={{ 
                         top: '0', // Adjusted to align with page top
                         left: '0', // Adjusted to align with page left
                         pointerEvents: isDrawingMode ? 'auto' : 'none',
                         cursor: isDrawingMode 
                           ? (currentTool === 'eraser' ? 'crosshair' // Consider specific cursors
                              : currentTool === 'highlighter' ? 'crosshair'
                              : (currentTool === 'pen' || currentTool === 'line' || currentTool === 'rectangle' || currentTool === 'circle') ? 'crosshair' 
                              : 'default')
                            : 'default',
                         touchAction: isDrawingMode ? 'none' : 'auto' // Prevent scrolling while drawing
                       }}
                       onMouseDown={startDrawing}
                       onMouseMove={draw}
                       onMouseUp={stopDrawing}
                       onMouseLeave={() => { if (isDrawing) { stopDrawing(); } }} // Stop if mouse leaves canvas
                       onTouchStart={startDrawing}
                       onTouchMove={draw}
                       onTouchEnd={stopDrawing}
                       onTouchCancel={() => { if (isDrawing) { stopDrawing(); } }} // Handle touch cancellation
                     />
                   </div>
                 )}
               </Document>
             </div>
           </div>
         </div>
         {/* Notes panel */} 
         {showNotes && (
           <div className={`h-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} overflow-auto flex flex-col border-l ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} transition-all duration-300 ease-in-out w-1/4 min-w-[250px]`}>
                 {/* Notes Header */} 
                 <div className={`p-3 flex items-center justify-between border-b ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h3 className={`font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>ملاحظات الصفحة {pageNumber}</h3>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="p-1 rounded-full" onClick={() => setShowNotes(false)}><X size={18} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} /></motion.button>
                 </div>
                 {/* Notes Controls */} 
                 <div className={`flex items-center gap-1 p-2 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                     <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className={`p-1.5 rounded ${notesAlignment === 'right' ? (theme === 'dark' ? 'bg-gray-700 text-emerald-400' : 'bg-gray-200 text-emerald-600') : ''}`} onClick={() => handleAlignmentChange('right')}><AlignRight size={16} /></motion.button>
                     <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className={`p-1.5 rounded ${notesAlignment === 'center' ? (theme === 'dark' ? 'bg-gray-700 text-emerald-400' : 'bg-gray-200 text-emerald-600') : ''}`} onClick={() => handleAlignmentChange('center')}><AlignCenter size={16} /></motion.button>
                     <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className={`p-1.5 rounded ${notesAlignment === 'left' ? (theme === 'dark' ? 'bg-gray-700 text-emerald-400' : 'bg-gray-200 text-emerald-600') : ''}`} onClick={() => handleAlignmentChange('left')}><AlignLeft size={16} /></motion.button>
                     <div className="flex-1"></div>
                     <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className={`p-1.5 rounded flex items-center gap-1 ${theme === 'dark' ? 'bg-emerald-700 hover:bg-emerald-600 text-white' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'}`} onClick={saveNotes}><Save size={16} /><span className="text-xs">حفظ</span></motion.button>
                 </div>
                 {/* Notes Textarea */} 
                 <textarea ref={textareaRef} value={notes} onChange={(e) => setNotes(e.target.value)} className={`flex-1 p-3 resize-none outline-none w-full ${theme === 'dark' ? 'bg-gray-800 text-gray-100 placeholder-gray-500' : 'bg-white text-gray-800 placeholder-gray-400'} border-none`} placeholder="اكتب ملاحظاتك هنا..." style={{ textAlign: notesAlignment }} dir="rtl"/>
             </div>
         )}
       </div>
       
       {/* Loading overlay during download */} 
        {isDownloading && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-[60]"> 
                 <div className="rounded-lg bg-white p-6 shadow-lg flex flex-col items-center space-y-3">
                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
                     <p className="text-gray-700 font-medium">جاري تحضير الملف للتحميل...</p>
                     <p className="text-sm text-gray-500">قد تستغرق هذه العملية بعض الوقت للملفات الكبيرة.</p>
                 </div>
             </div>
        )}

       {/* --- Floating Action Button Group --- */} 
       <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
            <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                className={`p-3 rounded-full shadow-lg flex items-center justify-center 
                           ${theme === 'dark' ? 'bg-gray-700 text-emerald-400 hover:bg-gray-600' : 'bg-white text-emerald-600 hover:bg-gray-100'}`}
                onClick={toggleFullscreen}
                title={isFullscreen ? "الخروج من وضع ملء الشاشة" : "وضع ملء الشاشة"}
                >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />} 
            </motion.button>
            <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                onClick={() => setIsToolPaletteOpen(!isToolPaletteOpen)}
                className={`p-3 rounded-full shadow-lg flex items-center justify-center 
                           ${theme === 'dark' ? 'bg-gray-700 text-emerald-400 hover:bg-gray-600' : 'bg-white text-emerald-600 hover:bg-gray-100'}
                           ${isToolPaletteOpen ? 'ring-2 ring-emerald-500' : ''}`}
                title={isToolPaletteOpen ? "إغلاق الأدوات" : "فتح الأدوات"}
            >
                {isToolPaletteOpen ? <X size={20} /> : <Palette size={20} />} 
            </motion.button>
       </div>

       {/* --- Tool Palette Popover/Modal --- */} 
       {isToolPaletteOpen && (
         <motion.div 
           initial={{ opacity: 0, y: 10, x: 10 }}
           animate={{ opacity: 1, y: 0, x: 0 }}
           exit={{ opacity: 0, y: 10, x: 10 }}
           className={`absolute bottom-28 right-4 z-40 p-3 space-y-2 rounded-lg shadow-xl w-max max-w-[220px] flex flex-col items-center  
                     ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-300'}`}
         >
            <div className="flex justify-around gap-2 w-full">
                 <motion.button 
                    onClick={undo} 
                    title="Undo" 
                    disabled={historyIndex <= 0 && drawingHistory.length <= 1} 
                    className={`p-2 rounded flex justify-center items-center ${historyIndex <= 0 && drawingHistory.length <= 1 ? 'opacity-50 cursor-not-allowed text-gray-500' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                 ><Undo size={18} /></motion.button>
                 <motion.button 
                    onClick={redo} 
                    title="Redo" 
                    disabled={historyIndex >= drawingHistory.length - 1} 
                    className={`p-2 rounded flex justify-center items-center ${historyIndex >= drawingHistory.length - 1 ? 'opacity-50 cursor-not-allowed text-gray-500' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                 ><Redo size={18} /></motion.button>
                 {/* Clear Button */} 
                 <motion.button 
                     onClick={clearCurrentPageDrawings} 
                     title="Clear Page Drawings" 
                     // Disable if there's nothing to clear (optional check: history length > 1 or check localstorage?)
                     // disabled={drawingHistory.length <= 1} 
                     className={`p-2 rounded flex justify-center items-center text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50`}
                 >
                     <Trash2 size={18} />
                 </motion.button>
             </div>
            <motion.button onClick={downloadPdfWithDrawings} title="Download PDF with Drawings" disabled={isDownloading || !numPages} className={`p-2 rounded flex justify-center items-center w-full ${isDownloading || !numPages ? 'opacity-50 cursor-not-allowed text-gray-500' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}><Download size={18} /><span className="ml-2 text-xs">تحميل مع الرسوم</span></motion.button>
            <div className={`h-px w-full my-1 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
            <div className="grid grid-cols-3 gap-2 w-full">
                 <motion.button onClick={() => { setCurrentTool('pen'); setIsDrawingMode(true); }} title="Pen" className={`p-2 rounded flex justify-center items-center ${currentTool === 'pen' ? 'bg-emerald-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}><Pencil size={18} /></motion.button>
                 <motion.button onClick={() => { setCurrentTool('highlighter'); setIsDrawingMode(true); }} title="Highlighter" className={`p-2 rounded flex justify-center items-center ${currentTool === 'highlighter' ? 'bg-emerald-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}><Highlighter size={18} /></motion.button>
                 <motion.button onClick={() => { setCurrentTool('eraser'); setIsDrawingMode(true); }} title="Eraser" className={`p-2 rounded flex justify-center items-center ${currentTool === 'eraser' ? 'bg-emerald-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}><Eraser size={18} /></motion.button>
                 <motion.button onClick={() => { setCurrentTool('line'); setIsDrawingMode(true); }} title="Line" className={`p-2 rounded flex justify-center items-center ${currentTool === 'line' ? 'bg-emerald-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}><Minus size={18} /></motion.button>
                 <motion.button onClick={() => { setCurrentTool('rectangle'); setIsDrawingMode(true); }} title="Rectangle" className={`p-2 rounded flex justify-center items-center ${currentTool === 'rectangle' ? 'bg-emerald-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}><RectangleHorizontal size={18} /></motion.button>
                 <motion.button onClick={() => { setCurrentTool('circle'); setIsDrawingMode(true); }} title="Circle" className={`p-2 rounded flex justify-center items-center ${currentTool === 'circle' ? 'bg-emerald-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}><Circle size={18} /></motion.button>
                 <motion.button onClick={() => { setCurrentTool('arrow'); setIsDrawingMode(true); }} title="Arrow" className={`p-2 rounded flex justify-center items-center ${currentTool === 'arrow' ? 'bg-emerald-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}><ArrowUpRight size={18} /></motion.button>
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {QUICK_COLORS.map((color) => (
              <button key={color} onClick={() => setDrawingColor(color)} className={`w-5 h-5 rounded-full border focus:outline-none focus:ring-2 focus:ring-offset-1 ${theme === 'dark' ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'} ${drawingColor === color ? 'ring-2 ring-emerald-500' : 'border-gray-400 dark:border-gray-600'}`} style={{ backgroundColor: color }} aria-label={`Select color ${color}`} title={color}/>
            ))}
            </div>
            <div className={`h-px w-full my-1 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
            <div className="flex flex-col space-y-3 w-full px-1">
                {(currentTool && currentTool !== 'eraser') && (<div className="flex items-center justify-between"><span className="text-xs text-gray-500 dark:text-gray-400">Color</span><label title="Color" className="p-0 cursor-pointer"><input type="color" value={drawingColor} onChange={(e) => { setDrawingColor(e.target.value); }} className="w-6 h-6 border-none cursor-pointer appearance-none" style={{backgroundColor: 'transparent', padding: 0}}/></label></div>)}
                {(currentTool && currentTool !== 'highlighter') && ( <div><label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{currentTool === 'eraser' ? 'Size' : 'Width'}</label><input type="range" min="1" max={currentTool === 'eraser' ? 50 : 15} value={drawingWidth} onChange={(e) => { setDrawingWidth(parseInt(e.target.value)); }} className="w-full h-2 cursor-pointer appearance-none bg-gray-300 dark:bg-gray-600 rounded-full" title={currentTool === 'eraser' ? "Eraser Size" : "Line Width"}/></div>)}
                {currentTool === 'highlighter' && ( <div><label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Highlight Width</label><input type="range" min="10" max="30" step="5" value={drawingWidth} onChange={(e) => { setDrawingWidth(parseInt(e.target.value)); }} className="w-full h-2 cursor-pointer appearance-none bg-gray-300 dark:bg-gray-600 rounded-full" title="Highlighter Width"/></div>)}
                {(currentTool === 'rectangle' || currentTool === 'circle') && (<div className="flex items-center justify-between"><span className="text-xs text-gray-500 dark:text-gray-400">Fill</span><motion.button onClick={() => setIsShapeFilled(!isShapeFilled)} title={isShapeFilled ? "Draw Outline" : "Fill Shape"} className={`p-1.5 rounded ${isShapeFilled ? 'bg-emerald-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{isShapeFilled ? <PaintBucket size={16} /> : <Square size={16} />} </motion.button></div>)}
            </div>
         </motion.div>
       )}

      {/* --- Global Styles --- */} 
      <style jsx global>{`
        /* ... existing global styles ... */
        /* PDF Page styles */
        .pdf-display-area {
            background-color: ${theme === 'dark' ? '#374151' : '#e5e7eb'};
        }
        .react-pdf__Document {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .react-pdf__Page {
          position: relative; 
          background-color: white; 
        }
        .react-pdf__Page canvas { 
          display: block;
          user-select: none;
        }
        canvas {
          touch-action: none; /* Moved to inline style */
        }
        /* Input styles */
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; width: 14px; height: 14px;
          background: ${theme === 'dark' ? '#34d399' : '#10b981'}; cursor: pointer; border-radius: 50%;
        }
        input[type=range]::-moz-range-thumb {
          width: 14px; height: 14px; background: ${theme === 'dark' ? '#34d399' : '#10b981'};
          cursor: pointer; border-radius: 50%; border: none;
        }
        input[type="color"] {
            -webkit-appearance: none; -moz-appearance: none; appearance: none;
            width: 24px; height: 24px; background-color: transparent;
            border: 1px solid ${theme === 'dark' ? '#4b5563' : '#d1d5db'}; border-radius: 4px; 
            cursor: pointer; padding: 0; overflow: hidden; 
        }
        input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
        input[type="color"]::-webkit-color-swatch { border: none; border-radius: 3px; }
        input[type="color"]::-moz-color-swatch { border: none; border-radius: 3px; }
        /* Thumbnail styles */
        .react-pdf__Page_thumbnail canvas { max-width: 100%; height: auto !important; box-shadow: none !important; }
        /* Scrollbar styles */
        .scrollbar-thin { scrollbar-width: thin; scrollbar-color: ${theme === 'dark' ? '#4b5563 #1f2937' : '#a1a1aa #f3f4f6'}; }
        .scrollbar-thin::-webkit-scrollbar { width: 8px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: ${theme === 'dark' ? '#1f2937' : '#f3f4f6'}; border-radius: 10px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background-color: ${theme === 'dark' ? '#4b5563' : '#a1a1aa'}; border-radius: 10px; border: 2px solid ${theme === 'dark' ? '#1f2937' : '#f3f4f6'}; }
         /* Fullscreen styles */
         :fullscreen .pdf-display-area {
             /* Adjust height if needed, maybe not necessary if header stays */
         }
        html:has(div:fullscreen) {
            overflow: hidden; /* Hide body scrollbar when fullscreen */
        }
      `}</style>
    </div>
  );
};

export default PDFViewer;