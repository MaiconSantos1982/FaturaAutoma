'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
    className?: string;
    children: React.ReactNode;
}

export function Card({ className, children }: CardProps) {
    return (
        <div
            className={cn(
                'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden',
                className
            )}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    className?: string;
    children: React.ReactNode;
}

export function CardHeader({ className, children }: CardHeaderProps) {
    return (
        <div className={cn('px-6 py-4 border-b border-gray-100', className)}>
            {children}
        </div>
    );
}

interface CardTitleProps {
    className?: string;
    children: React.ReactNode;
}

export function CardTitle({ className, children }: CardTitleProps) {
    return (
        <h3 className={cn('text-lg font-semibold text-gray-900', className)}>
            {children}
        </h3>
    );
}

interface CardContentProps {
    className?: string;
    children: React.ReactNode;
}

export function CardContent({ className, children }: CardContentProps) {
    return <div className={cn('px-6 py-4', className)}>{children}</div>;
}

interface CardFooterProps {
    className?: string;
    children: React.ReactNode;
}

export function CardFooter({ className, children }: CardFooterProps) {
    return (
        <div className={cn('px-6 py-4 bg-gray-50 border-t border-gray-100', className)}>
            {children}
        </div>
    );
}
