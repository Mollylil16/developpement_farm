/**
 * Tests pour useDashboardAnimations
 */

import { renderHook } from '@testing-library/react-native';
import { useDashboardAnimations } from '../useDashboardAnimations';
import { Animated } from 'react-native';

// Mock Animated
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Animated: {
      ...RN.Animated,
      Value: jest.fn((initialValue) => ({
        _value: initialValue,
        setValue: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
      })),
      spring: jest.fn(() => ({
        start: jest.fn(),
      })),
      sequence: jest.fn((animations) => ({
        start: jest.fn(),
      })),
      delay: jest.fn((delay) => ({
        start: jest.fn(),
      })),
    },
  };
});

describe('useDashboardAnimations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner les animations initialisées', () => {
    const { result } = renderHook(() => useDashboardAnimations());

    expect(result.current.headerAnim).toBeDefined();
    expect(result.current.mainWidgetsAnim).toHaveLength(4);
    expect(result.current.secondaryWidgetsAnim).toHaveLength(6);
  });

  it('devrait initialiser toutes les animations à 0', () => {
    const { result } = renderHook(() => useDashboardAnimations());

    expect(result.current.headerAnim._value).toBe(0);
    result.current.mainWidgetsAnim.forEach((anim) => {
      expect(anim._value).toBe(0);
    });
    result.current.secondaryWidgetsAnim.forEach((anim) => {
      expect(anim._value).toBe(0);
    });
  });

  it('devrait lancer les animations au montage', () => {
    renderHook(() => useDashboardAnimations());

    // Vérifier que Animated.spring a été appelé pour le header
    expect(Animated.spring).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    );
  });

  it('devrait créer des animations stables entre les re-renders', () => {
    const { result, rerender } = renderHook(() =>
      useDashboardAnimations()
    );

    const firstHeaderAnim = result.current.headerAnim;
    const firstMainWidgets = result.current.mainWidgetsAnim;
    const firstSecondaryWidgets = result.current.secondaryWidgetsAnim;

    rerender();

    // Les animations devraient être les mêmes instances
    expect(result.current.headerAnim).toBe(firstHeaderAnim);
    expect(result.current.mainWidgetsAnim).toBe(firstMainWidgets);
    expect(result.current.secondaryWidgetsAnim).toBe(firstSecondaryWidgets);
  });
});

