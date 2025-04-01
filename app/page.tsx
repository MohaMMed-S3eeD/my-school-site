'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, BookOpen, GraduationCap, Calendar, Layers } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import PDFViewer from '@/components/PDFViewer';

// Types for our data structure
interface Lesson {
  id: number;
  title: string;
  pptFileName: string;
  unitId: number;
}

interface Unit {
  id: number;
  name: string;
  semesterId: number;
  lessons: Lesson[];
}

interface Semester {
  id: number;
  name: string;
  yearId: number;
  units: Unit[];
}

interface Year {
  id: number;
  name: string;
  semesters: Semester[];
}

interface YearsResponse {
  years: Year[];
}

// نوع عنصر المحتوى المعروض
type ContentItem = Year | Semester | Unit | Lesson;

// نوع المحتوى المفلتر
interface FilteredContent {
  type: 'years' | 'semesters' | 'units' | 'lessons';
  items: ContentItem[];
}

export default function Home() {
  const { theme } = useTheme();
  const [years, setYears] = useState<Year[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<Year | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);

  // Fetch years data from the API
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const response = await fetch('/api/years');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data: YearsResponse = await response.json();
        setYears(data.years);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data');
        setLoading(false);
        console.error('Error fetching years:', err);
      }
    };

    fetchYears();
  }, []);

  // تحسين منطق البحث مع الانتقال المباشر للدرس
  const handleSearch = (term: string) => {
    if (!term.trim()) {
      setSelectedYear(null);
      setSelectedSemester(null);
      setSelectedUnit(null);
      return;
    }

    const searchLower = term.toLowerCase().trim();

    // البحث عن الدروس مباشرة في كل المستويات
    for (const year of years) {
      for (const semester of year.semesters) {
        for (const unit of semester.units) {
          // نبحث عن تطابق في الدروس
          const matchingLesson = unit.lessons.find(lesson =>
            lesson.title.toLowerCase().includes(searchLower)
          );

          if (matchingLesson) {
            // إذا وجدنا درساً مطابقاً، ننتقل مباشرة إلى الوحدة التي تحتويه
            setSelectedYear(year);
            setSelectedSemester(semester);
            setSelectedUnit(unit);
            return; // نخرج من الدالة فوراً بعد العثور على تطابق
          }
        }
      }
    }
  };

  // تحديث البحث فوراً عند الكتابة
  useEffect(() => {
    handleSearch(searchTerm);
  }, [searchTerm]);

  // الفلترة للعرض مع التركيز على الدروس
  const filteredContent = React.useMemo<FilteredContent>(() => {
    const searchLower = searchTerm.toLowerCase().trim();
    
    if (!searchLower) {
      if (selectedUnit) return { type: 'lessons', items: selectedUnit.lessons };
      if (selectedSemester) return { type: 'units', items: selectedSemester.units };
      if (selectedYear) return { type: 'semesters', items: selectedYear.semesters };
      return { type: 'years', items: years };
    }

    // إذا كنا في مستوى الوحدة، نعرض الدروس المطابقة فقط
    if (selectedUnit) {
      const matchingLessons = selectedUnit.lessons.filter(lesson =>
        lesson.title.toLowerCase().includes(searchLower)
      );
      return {
        type: 'lessons',
        items: matchingLessons
      };
    }

    // إذا كنا في مستوى الترم، نبحث عن الدروس في كل الوحدات
    if (selectedSemester) {
      const matchingUnits = selectedSemester.units.filter(unit =>
        unit.lessons.some(lesson => lesson.title.toLowerCase().includes(searchLower))
      );
      
      // إذا وجدنا وحدة واحدة فقط تحتوي على درس مطابق، ننتقل إليها مباشرة
      if (matchingUnits.length === 1) {
        setSelectedUnit(matchingUnits[0]);
        return {
          type: 'lessons',
          items: matchingUnits[0].lessons.filter(lesson =>
            lesson.title.toLowerCase().includes(searchLower)
          )
        };
      }
      
      return {
        type: 'units',
        items: matchingUnits
      };
    }

    // إذا كنا في مستوى السنة، نبحث عن الدروس في كل الترمات
    if (selectedYear) {
      const matchingSemesters = selectedYear.semesters.filter(semester =>
        semester.units.some(unit =>
          unit.lessons.some(lesson => lesson.title.toLowerCase().includes(searchLower))
        )
      );

      // إذا وجدنا ترم واحد فقط يحتوي على درس مطابق
      if (matchingSemesters.length === 1) {
        const semester = matchingSemesters[0];
        const matchingUnit = semester.units.find(unit =>
          unit.lessons.some(lesson => lesson.title.toLowerCase().includes(searchLower))
        );
        
        if (matchingUnit) {
          setSelectedSemester(semester);
          setSelectedUnit(matchingUnit);
          return {
            type: 'lessons',
            items: matchingUnit.lessons.filter(lesson =>
              lesson.title.toLowerCase().includes(searchLower)
            )
          };
        }
      }

      return {
        type: 'semesters',
        items: matchingSemesters
      };
    }

    // البحث العام
    const matchingYears = years.filter(year =>
      year.semesters.some(semester =>
        semester.units.some(unit =>
          unit.lessons.some(lesson => lesson.title.toLowerCase().includes(searchLower))
        )
      )
    );

    // إذا وجدنا سنة واحدة فقط تحتوي على درس مطابق
    if (matchingYears.length === 1) {
      const year = matchingYears[0];
      const matchingSemester = year.semesters.find(semester =>
        semester.units.some(unit =>
          unit.lessons.some(lesson => lesson.title.toLowerCase().includes(searchLower))
        )
      );

      if (matchingSemester) {
        const matchingUnit = matchingSemester.units.find(unit =>
          unit.lessons.some(lesson => lesson.title.toLowerCase().includes(searchLower))
        );

        if (matchingUnit) {
          setSelectedYear(year);
          setSelectedSemester(matchingSemester);
          setSelectedUnit(matchingUnit);
          return {
            type: 'lessons',
            items: matchingUnit.lessons.filter(lesson =>
              lesson.title.toLowerCase().includes(searchLower)
            )
          };
        }
      }
    }

    return {
      type: 'years',
      items: matchingYears
    };
  }, [years, searchTerm, selectedYear, selectedSemester, selectedUnit]);

  // طريقة فتح ملف PDF مع واجهة السبورة الذكية
  const handleOpenPdf = (pdfFileName: string) => {
    try {
      console.log(`فتح ملف PDF: ${pdfFileName}`);
      
      // التأكد من أن اسم الملف ليس فارغًا
      if (!pdfFileName) {
        alert('اسم ملف PDF غير صالح');
        return;
      }
      
      // التأكد من وجود امتداد .pdf
      const fileName = pdfFileName.endsWith('.pdf') 
        ? pdfFileName 
        : `${pdfFileName}.pdf`;
      
      // إنشاء المسار الكامل مع التشفير المناسب
      const pdfUrl = `/data/${fileName}`;
      
      console.log(`المسار النهائي للملف: ${pdfUrl}`);
      
      // تعيين المسار للعرض
      setSelectedPdfUrl(pdfUrl);
    } catch (err) {
      console.error('خطأ في فتح ملف PDF:', err);
      alert('حدث خطأ أثناء محاولة فتح ملف PDF');
    }
  };

  // إغلاق واجهة عرض PDF
  const handleClosePdf = () => {
    setSelectedPdfUrl(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 to-slate-900">
        <div className="text-center bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
          <div className="inline-block h-10 w-10 border-3 border-t-emerald-500 border-emerald-300/10 rounded-full animate-spin"></div>
          <p className="mt-3 text-base font-medium text-emerald-400">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 to-slate-900">
        <div className="text-center p-6 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800">
          <motion.div 
            className="text-rose-400 text-4xl mb-3"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >⚠️</motion.div>
          <h2 className="text-xl font-bold text-rose-400 mb-2">حدث خطأ</h2>
          <p className="text-gray-400 mb-3">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30 transition-colors border border-rose-500/30"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className={`min-h-screen py-6 px-3 relative overflow-hidden ${
      theme === 'dark' ? 'dark-theme' : 'light-theme'
    }`}>
      {/* Enhanced background elements */}
      <div className="absolute inset-0 bg-dots-pattern opacity-30 pointer-events-none"></div>
      <div className="absolute inset-0 bg-glow-pattern pointer-events-none"></div>
      
      {/* Floating shapes for visual interest */}
      <div className="floating-shape w-64 h-64 top-20 left-10" 
           style={{ 
             background: theme === 'dark' 
               ? 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)' 
               : 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)',
             animationDelay: '0s'
           }}>
      </div>
      <div className="floating-shape w-96 h-96 bottom-20 right-10" 
           style={{ 
             background: theme === 'dark' 
               ? 'radial-gradient(circle, rgba(14,165,233,0.3) 0%, transparent 70%)' 
               : 'radial-gradient(circle, rgba(14,165,233,0.2) 0%, transparent 70%)',
             animationDelay: '-5s'
           }}>
      </div>
      <div className="floating-shape w-80 h-80 bottom-40 left-1/3" 
           style={{ 
             background: theme === 'dark' 
               ? 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)' 
               : 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
             animationDelay: '-10s'
           }}>
      </div>
      
      <div className="max-w-5xl mx-auto relative z-10">
        {/* Theme Toggle */}
        <div className="absolute top-0 left-0">
          <ThemeToggle />
        </div>
        
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1 
            className={`text-2xl md:text-3xl font-bold ${
              theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
            }`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            منصة التعليم الإلكتروني
          </motion.h1>
          <motion.p 
            className={`mt-2 text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            اكتشف دروسنا المتميزة لمساعدتك في رحلتك التعليمية
          </motion.p>
        </div>

        {/* Search */}
        <motion.div 
          className="mb-6 max-w-lg mx-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="relative group">
            <input
              type="text"
              placeholder="ابحث عن سنة، ترم، وحدة، أو درس..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-2 pr-10 text-sm rounded-lg border ${
                theme === 'dark' 
                  ? 'border-gray-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 bg-gray-900/50 text-gray-200' 
                  : 'border-gray-300 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 bg-white/70 text-gray-800'
              } backdrop-blur-sm`}
              dir="rtl"
            />
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
              theme === 'dark' ? 'text-gray-500 group-hover:text-emerald-400' : 'text-gray-500 group-hover:text-emerald-600'
            } transition-colors`} size={16} />
          </div>
        </motion.div>

        {/* Navigation */}
        {(selectedYear || selectedSemester || selectedUnit) && (
          <motion.div 
            className={`flex items-center gap-2 text-sm mb-4 px-3 py-1.5 rounded-lg ${
              theme === 'dark' ? 'text-gray-400 bg-gray-900/30' : 'text-gray-600 bg-gray-200/50'
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <button 
              onClick={() => {
                setSelectedYear(null);
                setSelectedSemester(null);
                setSelectedUnit(null);
              }}
              className="hover:text-emerald-400 transition-colors"
            >
              الرئيسية
            </button>
            {selectedYear && (
              <>
                <span className="text-emerald-400">/</span>
                <button 
                  onClick={() => {
                    setSelectedSemester(null);
                    setSelectedUnit(null);
                  }}
                  className={`${!selectedSemester ? 'text-emerald-400 font-medium' : 'hover:text-emerald-400 transition-colors'}`}
                >
                  {selectedYear.name}
                </button>
              </>
            )}
            {selectedSemester && (
              <>
                <span className="text-emerald-400">/</span>
                <button 
                  onClick={() => {
                    setSelectedUnit(null);
                  }}
                  className={`${!selectedUnit ? 'text-emerald-400 font-medium' : 'hover:text-emerald-400 transition-colors'}`}
                >
                  {selectedSemester.name}
                </button>
              </>
            )}
            {selectedUnit && (
              <>
                <span className="text-emerald-400">/</span>
                <span className="text-emerald-400 font-medium">{selectedUnit.name}</span>
              </>
            )}
          </motion.div>
        )}

        {/* Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredContent.type === 'years' && filteredContent.items.map((year, index) => {
            // يجب تأكيد نوع البيانات لتجنب أخطاء TypeScript
            const typedYear = year as Year;
            return (
              <motion.div 
                key={typedYear.id}
                className={`group rounded-lg p-4 cursor-pointer border transition-all duration-300 ${
                  theme === 'dark' 
                    ? 'bg-gray-900/50 border-gray-800 hover:border-emerald-500/30' 
                    : 'bg-white/70 border-gray-300 hover:border-emerald-500/30'
                } backdrop-blur-sm`}
                onClick={() => setSelectedYear(typedYear)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ y: -4 }}
              >
                <motion.div 
                  className="flex justify-center mb-3"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                >
                  <GraduationCap className={theme === 'dark' ? 'text-emerald-400 w-8 h-8' : 'text-emerald-600 w-8 h-8'} />
                </motion.div>
                <h3 className={`text-base font-medium mb-1 text-center ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>{typedYear.name}</h3>
                <p className={`text-xs text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>{typedYear.semesters.length} ترم</p>
              </motion.div>
            );
          })}

          {filteredContent.type === 'semesters' && filteredContent.items.map((semester, index) => {
            // يجب تأكيد نوع البيانات لتجنب أخطاء TypeScript
            const typedSemester = semester as Semester;
            return (
              <motion.div 
                key={typedSemester.id}
                className={`group rounded-lg p-4 cursor-pointer border transition-all duration-300 ${
                  theme === 'dark' 
                    ? 'bg-gray-900/50 border-gray-800 hover:border-cyan-500/30' 
                    : 'bg-white/70 border-gray-300 hover:border-cyan-500/30'
                } backdrop-blur-sm`}
                onClick={() => setSelectedSemester(typedSemester)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ y: -4 }}
              >
                <motion.div 
                  className="flex justify-center mb-3"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Calendar className={theme === 'dark' ? 'text-cyan-400 w-8 h-8' : 'text-cyan-600 w-8 h-8'} />
                </motion.div>
                <h3 className={`text-base font-medium mb-1 text-center ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>{typedSemester.name}</h3>
                <p className={`text-xs text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>{typedSemester.units.length} وحدة</p>
              </motion.div>
            );
          })}

          {filteredContent.type === 'units' && filteredContent.items.map((unit, index) => {
            // يجب تأكيد نوع البيانات لتجنب أخطاء TypeScript
            const typedUnit = unit as Unit;
            return (
              <motion.div 
                key={typedUnit.id}
                className={`group rounded-lg p-4 cursor-pointer border transition-all duration-300 ${
                  theme === 'dark' 
                    ? 'bg-gray-900/50 border-gray-800 hover:border-sky-500/30' 
                    : 'bg-white/70 border-gray-300 hover:border-sky-500/30'
                } backdrop-blur-sm`}
                onClick={() => setSelectedUnit(typedUnit)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ y: -4 }}
              >
                <motion.div 
                  className="flex justify-center mb-3"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Layers className={theme === 'dark' ? 'text-sky-400 w-8 h-8' : 'text-sky-600 w-8 h-8'} />
                </motion.div>
                <h3 className={`text-base font-medium mb-1 text-center ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>{typedUnit.name}</h3>
                <p className={`text-xs text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>{typedUnit.lessons.length} درس</p>
              </motion.div>
            );
          })}

          {filteredContent.type === 'lessons' && filteredContent.items.map((lesson, index) => {
            // يجب تأكيد نوع البيانات لتجنب أخطاء TypeScript
            const typedLesson = lesson as Lesson;
            return (
              <motion.div 
                key={typedLesson.id}
                className={`group rounded-lg p-4 cursor-pointer border transition-all duration-300 ${
                  theme === 'dark' 
                    ? 'bg-gray-900/50 border-gray-800 hover:border-blue-500/30' 
                    : 'bg-white/70 border-gray-300 hover:border-blue-500/30'
                } backdrop-blur-sm`}
                onClick={() => handleOpenPdf(typedLesson.pptFileName)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ y: -4 }}
              >
                <motion.div 
                  className="flex justify-center mb-3"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                >
                  <BookOpen className={theme === 'dark' ? 'text-blue-400 w-8 h-8' : 'text-blue-600 w-8 h-8'} />
                </motion.div>
                <h3 className={`text-sm font-medium mb-1 text-center ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>{typedLesson.title}</h3>
              </motion.div>
            );
          })}
        </div>

        {/* No results */}
        {searchTerm && filteredContent.items.length === 0 && (
          <motion.div 
            className="text-center py-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>لا توجد نتائج تطابق بحثك. حاول بكلمات أخرى.</p>
          </motion.div>
        )}
      </div>

      {/* PDF Viewer Component */}
      {selectedPdfUrl && (
        <PDFViewer pdfUrl={selectedPdfUrl} onClose={handleClosePdf} />
      )}
    </main>
  );
}