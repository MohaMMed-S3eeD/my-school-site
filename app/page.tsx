"use client";
import { useState, useEffect } from "react";

interface Lesson {
  id: number;
  title: string;
  pptFileName: string; // تغيير من pptUrl إلى pptFileName
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

export default function Home() {
  const [years, setYears] = useState<Year[]>([]);
  const [selectedYear, setSelectedYear] = useState<Year | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchYears = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/years");
      const data: YearsResponse = await response.json();
      setYears(data.years);
    } catch (error) {
      console.error("Error fetching years:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  const getBreadcrumbs = () => {
    const items = [];
    if (selectedYear) {
      items.push({
        label: selectedYear.name,
        onClick: () => {
          setSelectedSemester(null);
        },
      });
    }
    if (selectedSemester) {
      items.push({ label: selectedSemester.name });
    }
    return items;
  };

  return (
    <div className="min-h-screen bg-gradient-to-bl from-indigo-950 via-blue-900 to-sky-900 animate-gradient-xy overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_500px_at_50%_200px,#3b82f6,transparent)] opacity-30" />
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_left,#4f46e5,#3b82f6,#0ea5e9)] opacity-10 mix-blend-overlay animate-gradient-x" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent,#000)] opacity-90" />
      </div>
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(white,transparent_90%)] pointer-events-none opacity-20" />

      <main className="container mx-auto px-4 py-6 relative z-10">
        {/* Header with Breadcrumbs */}
        <div className="mb-12 flex flex-col items-center">
          <h1 className="text-6xl font-black text-center pb-5 text-transparent bg-clip-text bg-gradient-to-l from-blue-100 via-blue-200 to-blue-100 drop-shadow-lg animate-pulse-slow">
            البوابة التعليمية
          </h1>
          {getBreadcrumbs().length > 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-200">
              <button
                onClick={() => {
                  setSelectedYear(null);
                  setSelectedSemester(null);
                }}
                className="hover:text-blue-300 transition-colors duration-300"
              >
                الرئيسية
              </button>
              {getBreadcrumbs().map((item, index) => (
                <div key={index} className="flex items-center">
                  <span className="mx-2 text-blue-300">←</span>
                  <button onClick={item.onClick} className="hover:text-blue-300 transition-colors duration-300">
                    {item.label}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-300"></div>
          </div>
        )}

        {/* Display Years */}
        {!isLoading && !selectedYear && (
          <>
            {years.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 glass rounded-2xl animate-fadeIn">
                <div className="p-4 rounded-full bg-blue-500/10 mb-4">
                  <svg className="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xl text-gray-300 font-medium">لا توجد سنوات دراسية حالياً</p>
                <p className="text-sm text-gray-400 mt-2">سيتم إضافة المحتوى قريباً</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
                {years.map((year, index) => (
                  <div
                    key={year.id}
                    className={`glass rounded-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 cursor-pointer animate-slideUp animate-delay-${index + 1} group overflow-hidden`}
                    onClick={() => setSelectedYear(year)}
                  >
                    <div className="p-6 relative">
                      <div className="absolute inset-0 bg-gradient-to-l from-blue-400/10 to-cyan-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <h2 className="text-2xl font-bold text-white mb-4">{year.name}</h2>
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center gap-2 text-gray-200 group-hover:text-blue-200 transition-colors">
                          <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2-2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <span className="text-base">{year.semesters.length} فصول دراسية</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-200 group-hover:text-blue-200 transition-colors">
                          <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          <span className="text-base">
                            {year.semesters.reduce(
                              (acc, semester) =>
                                acc +
                                semester.units.reduce((acc, unit) => acc + unit.lessons.length, 0),
                              0
                            )}{" "}
                            درس
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Display Semesters */}
        {selectedYear && !selectedSemester && (
          <>
            {selectedYear.semesters.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 glass rounded-2xl animate-fadeIn">
                <div className="p-4 rounded-full bg-blue-500/10 mb-4">
                  <svg className="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-xl text-gray-300 font-medium">لا توجد فصول دراسية في {selectedYear.name}</p>
                <p className="text-sm text-gray-400 mt-2">سيتم إضافة الفصول الدراسية قريباً</p>
              </div>
            ) : (
              <div className="animate-fadeIn grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {selectedYear.semesters.map((semester, index) => (
                  <div
                    key={semester.id}
                    className={`glass rounded-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 cursor-pointer animate-slideUp animate-delay-${index + 1}`}
                    onClick={() => setSelectedSemester(semester)}
                  >
                    <div className="p-6 relative">
                      <div className="absolute inset-0 bg-gradient-to-l from-blue-400/10 to-cyan-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <h3 className="text-xl font-bold text-white mb-4">{semester.name}</h3>
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center gap-2 text-gray-200 group-hover:text-blue-200 transition-colors">
                          <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <span className="text-base">{semester.units.length} وحدات</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-200 group-hover:text-blue-200 transition-colors">
                          <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          <span className="text-base">
                            {semester.units.reduce((acc, unit) => acc + unit.lessons.length, 0)} درس
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Display Units and Lessons */}
        {selectedSemester && (
          <>
            {selectedSemester.units.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 glass rounded-2xl animate-fadeIn">
                <div className="p-4 rounded-full bg-blue-500/10 mb-4">
                  <svg className="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-xl text-gray-300 font-medium">لا توجد وحدات في {selectedSemester.name}</p>
                <p className="text-sm text-gray-400 mt-2">سيتم إضافة الوحدات التعليمية قريباً</p>
              </div>
            ) : (
              <div className="animate-fadeIn grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {selectedSemester.units.map((unit, index) => (
                  <div
                    key={unit.id}
                    className={`glass rounded-xl p-5 transform hover:-translate-y-1 transition-all duration-300 animate-slideUp animate-delay-${index + 1} group flex flex-col`}
                  >
                    <h3 className="text-lg font-bold text-white/90 flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                      <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2-2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      {unit.name}
                    </h3>
                    <div className="flex-1 min-h-0">
                      {unit.lessons.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="p-3 rounded-full bg-blue-500/10 mb-3">
                            <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <p className="text-sm text-gray-400">لا توجد دروس متاحة في هذه الوحدة</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-[280px] overflow-y-auto custom-scrollbar">
                          {unit.lessons.map((lesson) => (
                            <a
                              key={lesson.id}
                              href={`/lesson/${encodeURIComponent(lesson.title)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full text-right p-2.5 rounded-lg glass-dark hover:bg-blue-500/10 transition-all flex items-center gap-2.5 group/item"
                            >
                              <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-300 group-hover/item:bg-blue-500/20 shrink-0">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                                </svg>
                              </div>
                              <span className="text-gray-200 group-hover/item:text-white text-sm flex-1 truncate">
                                {lesson.title}
                              </span>
                              <span className="text-blue-300 opacity-0 group-hover/item:opacity-100 transition-opacity text-xs flex items-center gap-1">
                                فتح الدرس
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
