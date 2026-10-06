import { vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    matches: true,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const navigation = (params: Record<string, any>): H5PNavigation => {
  const element = document.createElement('nav') as H5PNavigation;
  element.className = 'h5p-navigation';
  if (params.handleNext) {
    const next = document.createElement('button');
    next.className = 'h5p-theme-next';
    next.addEventListener('click', () => params.handleNext());
    element.append(next);
  }
  if (params.handleLast) {
    const last = document.createElement('button');
    last.className = 'h5p-theme-show-results';
    last.addEventListener('click', () => params.handleLast());
    element.append(last);
  }
  element.setCurrentIndex = () => undefined;
  element.setCanShowLast = (canShow: boolean) => {
    element.querySelector('.h5p-theme-show-results')?.classList.toggle('hidden', !canShow);
  };
  return element;
};

(globalThis as any).H5P = { Components: { Navigation: navigation } };
