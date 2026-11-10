import React from 'react';

const LATEX_REPLACEMENTS: Array<[RegExp, string]> = [
    [/\\alpha/g, 'α'],
    [/\\beta/g, 'β'],
    [/\\gamma/g, 'γ'],
    [/\\delta/g, 'δ'],
    [/\\Delta/g, 'Δ'],
    [/\\theta/g, 'θ'],
    [/\\lambda/g, 'λ'],
    [/\\mu/g, 'μ'],
    [/\\pi/g, 'π'],
    [/\\sigma/g, 'σ'],
    [/\\omega/g, 'ω'],
    [/\\Omega/g, 'Ω'],
    [/\\phi/g, 'φ'],
    [/\\infty/g, '∞'],
    [/\\sum/g, '∑'],
    [/\\int/g, '∫'],
    [/\\prod/g, '∏'],
    [/\\sqrt\{([^}]+)\}/g, '√($1)'],
    [/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1) / ($2)'],
    [/\\times/g, '×'],
    [/\\cdot/g, '·'],
    [/\\div/g, '÷'],
    [/\\pm/g, '±'],
    [/\\leq/g, '≤'],
    [/\\geq/g, '≥'],
    [/\\neq/g, '≠'],
    [/\\approx/g, '≈'],
    [/\\rightarrow|\\to/g, '→'],
    [/\\Rightarrow/g, '⇒'],
    [/\\forall/g, '∀'],
    [/\\exists/g, '∃'],
    [/\\in/g, '∈'],
];

const SUPERSCRIPTS: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', 'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ',
};

const SUBSCRIPTS: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', 'n': 'ₙ', 'i': 'ᵢ',
};

export function formatLatexToUnicode(input: string): string {
    let out = input.trim();
    for (const [regex, rep] of LATEX_REPLACEMENTS) {
        out = out.replace(regex, rep);
    }
    out = out.replace(/\^\{([^}]+)\}|\^([0-9n+-])/g, (_, grp, single) => {
        const chars = (grp || single || '').split('');
        return chars.map((c: string) => SUPERSCRIPTS[c] || `^${c}`).join('');
    });
    out = out.replace(/_\{([^}]+)\}|_([0-9ni+-])/g, (_, grp, single) => {
        const chars = (grp || single || '').split('');
        return chars.map((c: string) => SUBSCRIPTS[c] || `_${c}`).join('');
    });
    return out;
}

export const MathRenderer: React.FC<{ expression: string }> = ({ expression }) => {
    const formatted = formatLatexToUnicode(expression || 'E = mc^2');

    return (
        <div
            className="px-4 py-3 rounded-xl bg-slate-900/95 dark:bg-black/60 text-indigo-200 border border-indigo-500/30 font-mono text-sm tracking-wide text-center overflow-x-auto"
            dir="ltr"
        >
            {formatted}
        </div>
    );
};
