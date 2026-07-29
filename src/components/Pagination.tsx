import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  entityName?: string;
  pageSizeOptions?: number[];
  className?: string;
  compact?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  entityName = 'Data',
  pageSizeOptions = [10, 20, 50, 100],
  className = '',
  compact = false
}) => {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const startIndex = totalItems > 0 ? (validCurrentPage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(validCurrentPage * pageSize, totalItems);

  // Generate page numbers window
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisiblePages = compact ? 3 : 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, validCurrentPage - Math.floor(maxVisiblePages / 2));
      let end = Math.min(totalPages, start + maxVisiblePages - 1);

      if (end - start + 1 < maxVisiblePages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    return pages;
  };

  return (
    <div
      className={`bg-slate-50/90 border-t border-slate-200/90 px-4 py-3.5 sm:px-6 sm:py-4 flex flex-col ${
        compact ? 'gap-3' : 'xl:flex-row xl:items-center xl:justify-between gap-4'
      } text-xs text-slate-700 font-medium ${className}`}
    >
      {/* Left / Top Controls: Dropdown & Item Counter */}
      <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 sm:gap-4 w-full xl:w-auto">
        {/* Dropdown Selector */}
        <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-bold whitespace-nowrap">
            Tampilkan per halaman:
          </span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-black text-blue-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option} Data
              </option>
            ))}
          </select>
        </div>

        {/* Info Counter Badge */}
        <div className="text-xs text-slate-600 font-medium flex items-center space-x-1.5 flex-wrap">
          <span className="text-slate-500 font-semibold">Menampilkan</span>
          <span className="font-mono font-extrabold text-blue-800 bg-blue-50/90 border border-blue-200/80 px-2.5 py-0.5 rounded-lg shadow-2xs">
            {startIndex} - {endIndex}
          </span>
          <span className="text-slate-500 font-semibold">dari</span>
          <span className="font-mono font-extrabold text-slate-900 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
            {totalItems}
          </span>
          <span className="font-bold text-slate-700">{entityName}</span>
        </div>
      </div>

      {/* Right / Bottom Controls: Page Navigation Buttons */}
      <div className="flex items-center space-x-1.5 justify-center sm:justify-end w-full xl:w-auto pt-2 xl:pt-0 border-t xl:border-t-0 border-slate-200/60">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={validCurrentPage === 1}
          title="Halaman Pertama"
          className="p-2 rounded-xl border border-slate-200/90 bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-2xs cursor-pointer"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(Math.max(validCurrentPage - 1, 1))}
          disabled={validCurrentPage === 1}
          title="Halaman Sebelumnya"
          className="px-3 py-2 rounded-xl border border-slate-200/90 bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-2xs flex items-center space-x-1.5 font-bold cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Previous</span>
        </button>

        {/* Page Numbers */}
        <div className="flex items-center space-x-1 px-1">
          {getPageNumbers().map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`min-w-[36px] h-9 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center cursor-pointer ${
                validCurrentPage === pageNum
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 border border-blue-700 scale-105'
                  : 'bg-white text-slate-700 border border-slate-200/90 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
              }`}
            >
              {pageNum}
            </button>
          ))}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(Math.min(validCurrentPage + 1, totalPages))}
          disabled={validCurrentPage === totalPages || totalItems === 0}
          title="Halaman Selanjutnya"
          className="px-3 py-2 rounded-xl border border-slate-200/90 bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-2xs flex items-center space-x-1.5 font-bold cursor-pointer"
        >
          <span className="hidden sm:inline text-xs">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={validCurrentPage === totalPages || totalItems === 0}
          title="Halaman Terakhir"
          className="p-2 rounded-xl border border-slate-200/90 bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-2xs cursor-pointer"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

