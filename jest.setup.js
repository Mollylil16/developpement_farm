/**
 * Configuration Jest - Setup
 * Mocks et configuration globale pour les tests
 */

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  return {
    default: {
      call: () => {},
    },
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value) => value),
    withSpring: jest.fn((value) => value),
    withDecay: jest.fn((value) => value),
    withRepeat: jest.fn((value) => value),
    withSequence: jest.fn((...values) => values[0]),
    cancelAnimation: jest.fn(),
    Easing: {
      linear: jest.fn(),
      ease: jest.fn(),
      quad: jest.fn(),
      cubic: jest.fn(),
      bezier: jest.fn(),
    },
  };
});

// Mock formatters
jest.mock('./src/utils/formatters', () => ({
  formatDate: jest.fn((date, format) => {
    if (!date) return '';
    if (format === 'relative') return 'Il y a 2 heures';
    return '27 Nov 2025';
  }),
  formatDateCourt: jest.fn(() => '27/11'),
  formatMontant: jest.fn((amount) => amount?.toString() || '0'),
  formatMontantAvecDevise: jest.fn((amount) => `${amount || 0} FCFA`),
}));

// Mock PricingService
jest.mock('./src/services/PricingService', () => ({
  formatPrice: jest.fn((price, currency = 'FCFA') => `${price?.toLocaleString('fr-FR') || 0} ${currency}`),
  calculateTotalPrice: jest.fn(() => 1000),
  calculateDiscount: jest.fn(() => 10),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock ThemeContext
jest.mock('./src/contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      text: '#000000',
      textSecondary: '#666666',
      background: '#FFFFFF',
      surface: '#F5F5F5',
      divider: '#E0E0E0',
      primary: '#007AFF',
      error: '#FF3B30',
      success: '#34C759',
      warning: '#FF9500',
      info: '#5AC8FA',
      textOnPrimary: '#FFFFFF',
    },
  })),
  ThemeProvider: ({ children }) => children,
}));

// Mock immer pour éviter les problèmes ESM
jest.mock('immer', () => ({
  produce: jest.fn((state, fn) => fn(state)),
  default: {
    produce: jest.fn((state, fn) => fn(state)),
  },
}));

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

