'use client';

import { useState, useRef } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export default function FileUpload({ onFileSelect }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        onFileSelect(file);
      } else {
        alert('Please upload a PDF file only.');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        onFileSelect(file);
      } else {
        alert('Please upload a PDF file only.');
      }
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div
      className={`relative rounded-xl p-1 cursor-pointer group transition-all duration-500 ${
        dragActive
          ? 'scale-105 shadow-2xl shadow-violet-500/20'
          : selectedFile
          ? 'shadow-2xl shadow-green-500/20'
          : 'hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10'
      }`}
      style={{
        background: dragActive 
          ? 'linear-gradient(135deg, rgba(255, 89, 65, 0.3), rgba(255, 89, 65, 0.2), rgba(255, 89, 65, 0.1))'
          : selectedFile
          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.1))'
          : 'linear-gradient(135deg, rgba(255, 89, 65, 0.2), rgba(255, 89, 65, 0.1), rgba(255, 89, 65, 0.05))',
      }}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={onButtonClick}
    >
      {/* Inner content with dark background */}
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center relative z-10 transition-all duration-300 group-hover:shadow-lg">
      
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleChange}
        className="hidden"
      />
      
      <div className="relative z-10">
        <div className="mb-6">
          {selectedFile ? (
            <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          ) : dragActive ? (
            <div className="mx-auto w-20 h-20 bg-[#ff5941]/20 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <svg className="w-10 h-10 text-[#ff5941]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
          ) : (
            <div className="mx-auto w-20 h-20 bg-[#ff5941]/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-[#ff5941]/20 transition-colors duration-300">
              <svg className="w-10 h-10 text-[#ff5941] group-hover:text-[#ff5941] transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
          )}
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          {selectedFile ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
              {selectedFile.name.length > 25 ? selectedFile.name.substring(0, 25) + '...' : selectedFile.name}
            </span>
          ) : dragActive ? (
            'Drop your PDF here!'
          ) : (
            'Upload PDF Bank Statement'
          )}
        </h3>
        
        <p className="text-gray-600 text-sm mb-4">
          {selectedFile ? 'Click to select a different file' : 'Drag and drop your PDF here, or click to browse'}
        </p>
        
        {!selectedFile && (
          <div className="inline-flex items-center px-4 py-2 bg-purple-600/20 text-[#ff5941] rounded-full text-sm font-medium">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Choose File
          </div>
        )}
        
        {selectedFile && (
          <div className="mt-4 p-3 bg-gray-100 backdrop-blur-sm rounded-lg border border-green-500/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">File size:</span>
              <span className="text-green-400 font-medium">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
              <div className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full w-full"></div>
            </div>
          </div>
        )}
        
        {dragActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-purple-600/10 rounded-xl">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#ff5941]/20 flex items-center justify-center animate-bounce">
                <svg className="w-8 h-8 text-[#ff5941]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <p className="text-[#ff5941] font-medium">Drop your PDF here!</p>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}