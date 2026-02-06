
import React from 'react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    fullScreen?: boolean;
    message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    fullScreen = false,
    message = 'در حال بارگذاری...'
}) => {
    const sizeClasses = {
        sm: 'w-6 h-6 border-2',
        md: 'w-10 h-10 border-3',
        lg: 'w-16 h-16 border-4'
    };

    const spinner = (
        <div className="flex flex-col items-center justify-center gap-4">
            <div
                className={`${sizeClasses[size]} border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin`}
            />
            {message && (
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">
                    {message}
                </p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    {/* App Logo */}
                    <div className="mb-6">
                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/30">
                            <span className="text-3xl font-black text-white">P</span>
                        </div>
                    </div>
                    {spinner}
                </div>
            </div>
        );
    }

    return spinner;
};
