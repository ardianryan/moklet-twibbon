"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Github } from "lucide-react";

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/85 backdrop-blur-md px-4 md:px-8 py-4 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="relative w-10 h-10 overflow-hidden rounded-full border border-primary-200 bg-primary-50 flex items-center justify-center p-0.5 shadow-sm">
            <Image
              src="/logo_smansage.png"
              alt="Smansage Logo"
              width={38}
              height={38}
              className="object-contain"
            />
          </div>
          <span className="text-xl font-bold tracking-tight text-neutral-700">
            Smansage <span className="text-primary-500 font-semibold">Twibbon</span>
          </span>
        </Link>
        
        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-neutral-600 hover:text-primary-500 transition-colors"
          >
            Home
          </Link>
          
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-sm font-medium text-neutral-600 hover:text-primary-500 transition-colors flex items-center gap-1.5 focus:outline-none py-1 px-2 rounded-md hover:bg-neutral-100/50"
            >
              <Github className="w-4 h-4 text-neutral-500" />
              <span>GitHub</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 text-neutral-400 ${isOpen ? "rotate-180" : ""}`} />
            </button>
            
            {isOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-lg shadow-xl bg-white border border-neutral-200 focus:outline-none z-50 py-1 origin-top-right">
                <a
                  href="https://github.com/mokletdev/moklet-twibbon"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 text-xs text-neutral-700 hover:bg-primary-50 hover:text-primary-700 transition-colors border-b border-neutral-100"
                >
                  <div className="font-semibold">Original Repository</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5 font-normal">by Moklet Developers</div>
                </a>
                <a
                  href="https://github.com/ardianryan/moklet-twibbon"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 text-xs text-neutral-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                >
                  <div className="font-semibold">Smansage Fork Repository</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5 font-normal">by ardianryan</div>
                </a>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};
