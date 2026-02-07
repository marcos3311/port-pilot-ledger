import { useEffect, RefObject } from 'react';

/**
 * Hook to trap focus within a container when it is open.
 * Returns nothing, works as a side effect.
 */
export function useFocusTrap<T extends HTMLElement | null>(
    ref: RefObject<T>,
    isOpen: boolean
) {
    useEffect(() => {
        if (!isOpen || !ref.current) return;

        const element = ref.current;
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        // Focus the first element when opening
        if (firstElement) {
            // Small timeout to ensure rendering is complete
            setTimeout(() => {
                firstElement.focus();
            }, 50);
        }

        const handleTabKey = (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };

        const keyListener = (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                handleTabKey(e);
            }
        };

        document.addEventListener('keydown', keyListener);
        return () => {
            document.removeEventListener('keydown', keyListener);
        };
    }, [isOpen, ref]);
}
