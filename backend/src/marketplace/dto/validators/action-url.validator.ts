import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Validateur personnalisé pour actionUrl
 * Vérifie que l'URL est un chemin relatif sécurisé (pas de protocol externe, pas de javascript:, etc.)
 */
@ValidatorConstraint({ async: false })
export class IsActionUrlConstraint implements ValidatorConstraintInterface {
  validate(actionUrl: any, args: ValidationArguments) {
    if (!actionUrl) {
      return true; // Optionnel, donc null/undefined est valide
    }

    if (typeof actionUrl !== 'string') {
      return false;
    }

    // Vérifier que c'est un chemin relatif (commence par /)
    if (!actionUrl.startsWith('/')) {
      return false;
    }

    // Vérifier qu'il n'y a pas de protocole externe (http:, https:, javascript:, data:, etc.)
    const forbiddenProtocols = ['http:', 'https:', 'javascript:', 'data:', 'file:', 'ftp:'];
    const lowerUrl = actionUrl.toLowerCase();
    if (forbiddenProtocols.some(protocol => lowerUrl.includes(protocol))) {
      return false;
    }

    // Vérifier qu'il n'y a pas de caractères dangereux pour XSS
    const dangerousPatterns = ['<', '>', '"', "'", '`', '\n', '\r'];
    if (dangerousPatterns.some(char => actionUrl.includes(char))) {
      return false;
    }

    // Limiter la longueur (max 500 caractères)
    if (actionUrl.length > 500) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return "actionUrl doit être un chemin relatif sécurisé (commençant par '/') sans protocole externe ni caractères dangereux";
  }
}

/**
 * Décorateur pour valider actionUrl
 * Utilisation: @IsActionUrl()
 */
export function IsActionUrl(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsActionUrlConstraint,
    });
  };
}
