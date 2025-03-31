"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import LessonViewer from '../../components/LessonViewer';

export default function LessonPage() {
  const params = useParams();
  const [lessonTitle, setLessonTitle] = useState<string>('');
  const [lessonUrl, setLessonUrl] = useState<string>('');
  
  useEffect(() => {
    if (params.title) {
      // Convert the URL slug back to a title
      const decodedTitle = decodeURIComponent(params.title as string);
      setLessonTitle(decodedTitle);
      
      // Get the API url for the lesson content
      const formattedFileName = formatLessonFileName(decodedTitle);
      setLessonUrl(`https://mr-ahmed1.vercel.app/api/lessons/lesson?pptFileName=${formattedFileName}`);
    }
  }, [params]);
  
  // Duplicating the formatting function from the home page
  const formatLessonFileName = (title: string) => {
    return title
      .replace(/:/g, '') // إزالة النقطتين تماماً
      .replace(/\s+/g, '-') // استبدال المسافات بـ -
      .replace(/[^\u0621-\u064A0-9a-zA-Z-]/g, '') // الحفاظ على الحروف العربية والإنجليزية والأرقام والشرطات فقط
      + '.pdf'; // Add PDF extension
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4 flex justify-between items-center z-10 shadow-md">
        <h1 className="text-xl font-bold">{lessonTitle}</h1>
        <a 
          href="/" 
          className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          العودة للرئيسية
        </a>
      </header>
      
      {/* Main content */}
      <main className="flex-grow overflow-hidden">
        {lessonUrl && <LessonViewer lessonUrl={lessonUrl} />}
      </main>
    </div>
  );
}