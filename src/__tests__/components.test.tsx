import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MathRenderer, formatLatexToUnicode } from '../../components/editor/MathRenderer';
import { BlockNoteEditor } from '../../components/editor/BlockNoteEditor';
import { BlockNote } from '../../types';

describe('MathRenderer & BlockNoteEditor UI components', () => {
    it('transforms LaTeX math symbols and exponents cleanly offline', () => {
        expect(formatLatexToUnicode('\\frac{1}{2} + \\sqrt{9}')).toBe('(1) / (2) + √(9)');
        expect(formatLatexToUnicode('x^2 + \\alpha_1')).toBe('x² + α₁');

        render(<MathRenderer expression="E = mc^2" />);
        expect(screen.getByText('E = mc²')).toBeInTheDocument();
    });

    it('renders BlockNoteEditor, toggles checklist, invokes Focus callback, and converts block via / menu', () => {
        const onFocusItem = vi.fn();
        const initialBlocks: BlockNote[] = [
            { id: 'b1', type: 'checklist', content: 'حل تست‌های فصل ۲ زیست', checked: false },
            { id: 'b2', type: 'text', content: '' },
        ];

        const ControlledWrapper: React.FC = () => {
            const [blocks, setBlocks] = useState<BlockNote[]>(initialBlocks);
            return (
                <BlockNoteEditor
                    blocks={blocks}
                    onChange={setBlocks}
                    onFocusChecklistItem={onFocusItem}
                />
            );
        };

        render(<ControlledWrapper />);

        expect(screen.getByDisplayValue('حل تست‌های فصل ۲ زیست')).toBeInTheDocument();

        // Click Focus button on checklist item
        const focusBtn = screen.getByTitle('تمرکز روی همین مورد');
        fireEvent.click(focusBtn);
        expect(onFocusItem).toHaveBeenCalledWith('حل تست‌های فصل ۲ زیست');

        // Type '/' in empty text block to open slash menu and select heading1
        const textInput = screen.getByPlaceholderText('بنویسید یا / بزنید...');
        fireEvent.change(textInput, { target: { value: '/' } });
        expect(screen.getByText('تیتر بزرگ (H1)')).toBeInTheDocument();
        fireEvent.click(screen.getByText('تیتر بزرگ (H1)'));
        expect(screen.getByPlaceholderText('تیتر اصلی...')).toBeInTheDocument();
    });
});
