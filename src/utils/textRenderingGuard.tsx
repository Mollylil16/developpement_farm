/**
 * Utilitaire de protection contre les erreurs "Text strings must be rendered within a <Text> component"
 * Version améliorée avec détection et correction automatique
 */

import React from 'react';
import { Text } from 'react-native';

/**
 * Vérifie si une valeur est une primitive qui doit être wrappée dans <Text>
 */
export function isPrimitiveValue(value: any): boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

/**
 * Wrapper sécurisé pour les children qui détecte et corrige automatiquement
 * les strings/nombres rendus directement
 */
export function SafeTextWrapper({ 
  children, 
  componentName = 'Unknown',
  silent = false 
}: { 
  children: React.ReactNode; 
  componentName?: string;
  silent?: boolean;
}): React.ReactElement | null {
  // Si children est null ou undefined, retourner null
  if (children === null || children === undefined) {
    return null;
  }

  // Si children est une string, la wrapper dans un Text
  if (typeof children === 'string') {
    if (!silent) {
      console.warn(
        `⚠️ [SafeTextWrapper] String détectée dans ${componentName}, wrapping dans <Text>: "${children.substring(0, 50)}${children.length > 50 ? '...' : ''}"`
      );
    }
    return <Text>{children}</Text>;
  }

  // Si children est un nombre, le wrapper dans un Text
  if (typeof children === 'number') {
    if (!silent) {
      console.warn(
        `⚠️ [SafeTextWrapper] Number détecté dans ${componentName}, wrapping dans <Text>: ${children}`
      );
    }
    return <Text>{children}</Text>;
  }

  // Si children est un boolean, ne rien rendre (les booléens ne devraient jamais être affichés)
  if (typeof children === 'boolean') {
    if (!silent) {
      console.warn(
        `⚠️ [SafeTextWrapper] Boolean détecté dans ${componentName}, ignoré (les booléens ne sont pas affichés)`
      );
    }
    return null;
  }

  // Si children est un array, vérifier chaque élément
  if (Array.isArray(children)) {
    const safeChildren = children.map((child, index) => {
      if (isPrimitiveValue(child)) {
        if (!silent) {
          console.warn(
            `⚠️ [SafeTextWrapper] Primitive détectée dans ${componentName}[${index}], wrapping dans <Text>`
          );
        }
        return <Text key={index}>{String(child)}</Text>;
      }
      // Si c'est un élément React valide, le garder tel quel
      if (React.isValidElement(child)) {
        return child;
      }
      // Sinon, wrapper dans SafeTextWrapper récursivement
      return (
        <SafeTextWrapper key={index} componentName={`${componentName}[${index}]`} silent={silent}>
          {child}
        </SafeTextWrapper>
      );
    });
    return <>{safeChildren}</>;
  }

  // Si children est un Fragment React, vérifier ses enfants
  if (React.isValidElement(children) && children.type === React.Fragment) {
    // Si le Fragment contient des primitives, les wrapper
    const fragmentChildren = (children.props as any)?.children;
    if (fragmentChildren) {
      if (Array.isArray(fragmentChildren) || typeof fragmentChildren === 'string' || typeof fragmentChildren === 'number') {
        return (
          <SafeTextWrapper componentName={componentName} silent={silent}>
            {fragmentChildren}
          </SafeTextWrapper>
        );
      }
    }
  }

  // Si children est un élément React valide, le retourner tel quel
  if (React.isValidElement(children)) {
    return children as React.ReactElement;
  }

  // Sinon, essayer de convertir en string et wrapper
  if (!silent) {
    console.warn(
      `⚠️ [SafeTextWrapper] Type inconnu dans ${componentName}, conversion en string:`,
      typeof children
    );
  }
  return <Text>{String(children)}</Text>;
}

/**
 * Hook pour déboguer les valeurs qui pourraient causer des erreurs
 */
export function useTextRenderingDebug(value: any, label: string, componentName: string) {
  React.useEffect(() => {
    if (isPrimitiveValue(value) && value !== null && value !== undefined) {
      console.warn(
        `⚠️ [useTextRenderingDebug] ${componentName}.${label} est une valeur primitive:`,
        value,
        'Type:',
        typeof value
      );
    }
  }, [value, label, componentName]);
}

/**
 * HOC (Higher Order Component) pour wrapper automatiquement un composant
 * et protéger ses children
 */
export function withTextRenderingGuard<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function GuardedComponent(props: P & { children?: React.ReactNode }) {
    const { children, ...restProps } = props;
    
    return (
      <Component {...(restProps as P)}>
        {children ? (
          <SafeTextWrapper componentName={componentName} silent={true}>
            {children}
          </SafeTextWrapper>
        ) : null}
      </Component>
    );
  };
}

/**
 * Fonction utilitaire pour sécuriser une valeur avant de la rendre
 */
export function safeRenderValue(
  value: any,
  fallback: string | number = '-',
  componentName?: string
): React.ReactNode {
  if (value === null || value === undefined) {
    return <Text>{String(fallback)}</Text>;
  }
  
  if (isPrimitiveValue(value)) {
    return <Text>{String(value)}</Text>;
  }
  
  if (React.isValidElement(value)) {
    return value;
  }
  
  if (Array.isArray(value)) {
    return value.map((item, index) => (
      <SafeTextWrapper key={index} componentName={componentName} silent={true}>
        {item}
      </SafeTextWrapper>
    ));
  }
  
  return <Text>{String(value)}</Text>;
}

