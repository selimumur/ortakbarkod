"use client";

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

interface SearchableSelectProps {
    options: any[];
    value: any;
    onChange: (value: any) => void;
    placeholder: string;
    labelKey?: string;
    subLabelKey?: string;
    onCreate?: (searchValue: string) => void;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder,
    labelKey = 'name',
    subLabelKey,
    onCreate
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: any) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedItem = options.find((o: any) => o.id === value);
    const filteredOptions = options.filter((o: any) =>
        o[labelKey]?.toLowerCase().includes(search.toLowerCase()) ||
        (o.code && o.code.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div
                className="w-full bg-[#111827] border border-white/10 rounded-xl px-4 py-2.5 text-white flex justify-between items-center cursor-pointer min-h-[42px] hover:border-gray-600 focus:outline-none focus:border-blue-500"
                onClick={() => { setIsOpen(!isOpen); setSearch(""); }}
            >
                <span className={selectedItem ? 'text-white' : 'text-gray-500 text-sm'}>
                    {selectedItem ? selectedItem[labelKey] : placeholder}
                </span>
                <ChevronDown size={14} className="text-gray-500" />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-[#1f2937] border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                    <div className="sticky top-0 bg-[#1f2937] p-2 border-b border-gray-700">
                        <input
                            type="text"
                            autoFocus
                            placeholder="Ara..."
                            className="w-full bg-[#374151] text-white p-2 rounded border border-gray-600 outline-none text-sm placeholder-gray-400"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt: any) => (
                            <div
                                key={`${opt.id}-${Math.random()}`}
                                className="p-3 hover:bg-blue-600 hover:text-white cursor-pointer text-sm text-gray-300 border-b border-white/5 last:border-0 transition-colors"
                                onClick={() => { onChange(opt); setIsOpen(false); }}
                            >
                                <div className="font-medium">{opt[labelKey]}</div>
                                {subLabelKey && opt[subLabelKey] !== undefined && (
                                    <div className="text-xs opacity-70 mt-0.5">
                                        Bilgi: {opt[subLabelKey]}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="p-3 text-center">
                            <p className="text-gray-500 text-sm mb-2">Sonuç yok.</p>
                            {onCreate && search && (
                                <button
                                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded flex items-center justify-center gap-2"
                                    onClick={() => { onCreate(search); setIsOpen(false); }}
                                >
                                    <Plus size={14} /> Yeni Ekle: "{search}"
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
