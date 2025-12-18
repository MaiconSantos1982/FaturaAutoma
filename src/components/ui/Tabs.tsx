'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TabsProps {
    tabs: { id: string; label: string }[];
    activeTab: string;
    onChange: (tabId: string) => void;
    className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
    return (
        <div className={cn('border-b border-gray-200', className)}>
            <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={cn(
                            'py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200',
                            activeTab === tab.id
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>
        </div>
    );
}
