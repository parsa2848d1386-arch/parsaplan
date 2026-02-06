import React from 'react';

interface Props {
    percentage: number;
    colorClass?: string;
    heightClass?: string;
}

const ProgressBar: React.FC<Props> = ({ percentage, colorClass = "bg-emerald-500", heightClass = "h-2.5" }) => {
    return (
        <div className={`w-full bg-gray-200 rounded-full ${heightClass} dark:bg-gray-700`}>
            <div 
                className={`${colorClass} ${heightClass} rounded-full transition-all duration-500 ease-out`} 
                style={{ width: `${percentage}%` }}
            ></div>
        </div>
    );
};

export default ProgressBar;