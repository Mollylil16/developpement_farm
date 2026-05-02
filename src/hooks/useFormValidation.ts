/**
 * Hook personnalisé pour la validation de formulaires avec Yup
 * Gère la validation en temps réel, les erreurs, et l'état des champs touchés
 */

import { useState, useCallback, useEffect } from 'react';
import * as yup from 'yup';
import {
  validateWithSchema,
  validateField as validateYupField,
} from '../validation/financeSchemas';
import { logger } from '../utils/logger';

interface UseFormValidationOptions<T extends Record<string, any>> {
  schema: yup.ObjectSchema<T>;
  initialValues: T;
  onSubmit: (values: T) => Promise<void> | void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

interface UseFormValidationReturn<T> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  setFieldValue: (field: keyof T, value: unknown) => void;
  setFieldTouched: (field: keyof T, isTouched?: boolean) => void;
  handleFieldChange: (field: keyof T) => (value: unknown) => void;
  handleFieldBlur: (field: keyof T) => () => void;
  handleSubmit: () => Promise<void>;
  resetForm: () => void;
  setValues: (values: T) => void;
  validateForm: () => Promise<boolean>;
}

/**
 * Hook de validation de formulaire avec Yup
 */
export function useFormValidation<T extends Record<string, unknown>>({
  schema,
  initialValues,
  onSubmit,
  validateOnChange = true,
  validateOnBlur = true,
}: UseFormValidationOptions<T>): UseFormValidationReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculer si le formulaire est valide
  const isValid = Object.keys(errors).length === 0;

  /**
   * Réinitialiser le formulaire
   */
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  /**
   * Valider un champ individuel
   */
  const validateSingleField = useCallback(
    async (field: keyof T, value: unknown) => {
      try {
        const error = await validateYupField(schema, field as string, value, values);

        setErrors((prev) => {
          const newErrors = { ...prev };
          if (error) {
            newErrors[field as string] = error;
          } else {
            delete newErrors[field as string];
          }
          return newErrors;
        });

        return !error;
      } catch (err) {
        logger.error('Erreur validation champ:', err);
        return false;
      }
    },
    [schema, values]
  );

  /**
   * Valider tout le formulaire
   */
  const validateForm = useCallback(async (): Promise<boolean> => {
    const { isValid: formIsValid, errors: formErrors } = await validateWithSchema(schema, values);

    setErrors(formErrors);

    // Marquer tous les champs avec erreurs comme touchés
    if (!formIsValid) {
      const allTouched = Object.keys(formErrors).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {}
      );
      setTouched((prev) => ({ ...prev, ...allTouched }));
    }

    return formIsValid;
  }, [schema, values]);

  /**
   * Définir la valeur d'un champ
   */
  const setFieldValue = useCallback(
    (field: keyof T, value: unknown) => {
      setValues((prev) => ({ ...prev, [field]: value }));

      // Valider en temps réel si activé et si le champ a déjà été touché
      if (validateOnChange && touched[field as string]) {
        validateSingleField(field, value);
      }
    },
    [validateOnChange, touched, validateSingleField]
  );

  /**
   * Marquer un champ comme touché
   */
  const setFieldTouched = useCallback((field: keyof T, isTouched = true) => {
    setTouched((prev) => ({ ...prev, [field]: isTouched }));
  }, []);

  /**
   * Handler pour le changement de valeur d'un champ
   */
  const handleFieldChange = useCallback(
    (field: keyof T) => (value: unknown) => {
      setFieldValue(field, value);
    },
    [setFieldValue]
  );

  /**
   * Handler pour le blur d'un champ
   */
  const handleFieldBlur = useCallback(
    (field: keyof T) => () => {
      setFieldTouched(field, true);

      // Valider au blur si activé
      if (validateOnBlur) {
        validateSingleField(field, values[field]);
      }
    },
    [setFieldTouched, validateOnBlur, validateSingleField, values]
  );

  /**
   * Soumettre le formulaire
   */
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);

    try {
      // Valider tout le formulaire
      const formIsValid = await validateForm();

      if (!formIsValid) {
        setIsSubmitting(false);
        return;
      }

      // Appeler le callback de soumission
      await onSubmit(values);
    } catch (error) {
      logger.error('Erreur soumission formulaire:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, onSubmit, values]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    setFieldValue,
    setFieldTouched,
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
    resetForm,
    setValues,
    validateForm,
  };
}

/**
 * Hook simplifié pour validation de formulaire sans état géré
 * Utile quand vous gérez déjà l'état du formulaire ailleurs
 */
export function useFormValidationSimple<T extends Record<string, any>>(schema: yup.ObjectSchema<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback(
    async (fieldName: string, value: unknown, allValues: unknown) => {
      try {
        const error = await validateYupField(schema, fieldName, value, allValues);

        setErrors((prev) => {
          const newErrors = { ...prev };
          if (error) {
            newErrors[fieldName] = error;
          } else {
            delete newErrors[fieldName];
          }
          return newErrors;
        });

        return !error;
      } catch (err) {
        logger.error('Erreur validation:', err);
        return false;
      }
    },
    [schema]
  );

  const validateAllFields = useCallback(
    async (values: unknown) => {
      const { isValid, errors: validationErrors } = await validateWithSchema(schema, values);

      setErrors(validationErrors);

      if (!isValid) {
        const allTouched = Object.keys(validationErrors).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {}
        );
        setTouched((prev) => ({ ...prev, ...allTouched }));
      }

      return { isValid, errors: validationErrors };
    },
    [schema]
  );

  const markFieldTouched = useCallback((fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  }, []);

  const resetValidation = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  return {
    errors,
    touched,
    validateField,
    validateAllFields,
    markFieldTouched,
    resetValidation,
  };
}
