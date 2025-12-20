import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Valida que la fecha no sea futura
 * @param validationOptions Opciones de validación
 */
export function IsNotFutureDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isNotFutureDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) {
            return true; // Si no hay valor, dejar que otros validadores lo manejen
          }

          const date = new Date(value);
          const now = new Date();
          
          // Permitir hasta el final del día actual
          now.setHours(23, 59, 59, 999);
          
          return date <= now;
        },
        defaultMessage(args: ValidationArguments) {
          return 'Date cannot be in the future';
        },
      },
    });
  };
}

