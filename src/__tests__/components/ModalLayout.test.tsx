/**
 * Tests pour ModalLayout
 * Tests basiques pour vérifier la structure du composant
 */

// Mock ThemeContext avant les imports
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      text: '#000000',
      textSecondary: '#666666',
      background: '#FFFFFF',
      surface: '#F5F5F5',
      divider: '#E0E0E0',
    },
  }),
}));

describe('ModalLayout', () => {
  it('should be defined', () => {
    const ModalLayout = require('../../components/ModalLayout').default;
    expect(ModalLayout).toBeDefined();
  });

  it('should export as default', () => {
    const ModalLayout = require('../../components/ModalLayout').default;
    expect(typeof ModalLayout).toBe('function');
  });
});
