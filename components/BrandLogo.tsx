import React from 'react';

interface BrandLogoProps {
    /** Pixel size of the square SVG mark (default: 24) */
    size?: number;
    /** Additional classes on the SVG element */
    className?: string;
    /** Accessible title (omit or pass empty string if decorative) */
    title?: string;
}

/**
 * ParsaPlan "Orbit P" brand mark.
 * Geometric P monogram uniting a vertical focus stem with a 24-hour orbital loop and central focus dot.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
    size = 24,
    className = '',
    title,
}) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 256 256"
        width={size}
        height={size}
        className={className}
        aria-hidden={title ? undefined : true}
        role={title ? 'img' : undefined}
    >
        {title ? <title>{title}</title> : null}
        <path
            fill="currentColor"
            fillRule="evenodd"
            d="
                M 52 54
                A 22 22 0 0 1 74 32
                L 138 32
                A 72 72 0 1 1 138 176
                L 96 176
                L 96 202
                A 22 22 0 0 1 52 202
                Z
                M 96 74
                L 96 134
                L 138 134
                A 30 30 0 1 0 138 74
                Z
            "
        />
        <circle cx="138" cy="104" r="14" fill="currentColor" />
    </svg>
);

export default BrandLogo;
