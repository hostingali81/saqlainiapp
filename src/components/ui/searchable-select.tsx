'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { applyAvatarFallback } from '@/lib/utils';

interface SearchableSelectProps {
    options: { value: string; label: string; image?: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    onNewEntry?: () => void;
    showImages?: boolean;
}

export function SearchableSelect({ options, value, onChange, placeholder = "Select...", className = "", onNewEntry, showImages = true }: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchQuery('');
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-2 border rounded-md bg-background text-left flex items-center justify-between hover:bg-accent group"
            >
                <span className={selectedOption ? "text-foreground group-hover:text-white" : "text-muted-foreground group-hover:text-white"}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform group-hover:text-white ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-80">
                    {/* Search Input */}
                    <div className="p-2 border-b sticky top-0 bg-background">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-8 p-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-4 text-center">
                                <p className="text-sm text-muted-foreground mb-3">No results found</p>
                                {onNewEntry && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onNewEntry();
                                            setIsOpen(false);
                                            setSearchQuery('');
                                        }}
                                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                                    >
                                        + Add New Entry
                                    </button>
                                )}
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={`w-full text-left px-4 py-2 hover:bg-accent hover:text-white flex items-center gap-2 ${option.value === value ? 'bg-accent text-white font-medium' : ''
                                        }`}
                                >
                                    {showImages && option.image && (
                                        <img
                                            src={option.image}
                                            alt=""
                                            className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-gray-200"
                                            onError={(e) => {
                                                const name = option.label.split(' - ')[0] || 'User';
                                                applyAvatarFallback(e.currentTarget, name, 32);
                                            }}
                                        />
                                    )}
                                    <span className="flex-1">{option.label}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
