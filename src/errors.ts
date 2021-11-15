// see https://stackoverflow.com/a/41102306
const CAN_SET_PROTOTYPE = 'setPrototypeOf' in Object;

/**
 * Indicates that the pair has insufficient reserves for a desired output amount. I.e. the amount of output cannot be
 * obtained by sending any amount of input.
 */
export class InsufficientReservesError extends Error {
  public readonly isInsufficientReservesError: true = true;

  public constructor() {
    super();
    this.name = this.constructor.name;
    if (CAN_SET_PROTOTYPE) {
      Object.setPrototypeOf(this, new.target.prototype);
    }
  }
}

/**
 * Indicates that the input amount is too small to produce any amount of output. I.e. the amount of input sent is less
 * than the price of a single unit of output after fees.
 */
export class InsufficientInputAmountError extends Error {
  public readonly isInsufficientInputAmountError: true = true;

  public constructor() {
    super();
    this.name = this.constructor.name;
    if (CAN_SET_PROTOTYPE) {
      Object.setPrototypeOf(this, new.target.prototype);
    }
  }
}

export interface ValidationErrorField {
  name: string;
  message: string;
  code?: string | number;
}

/**
 * Form (or query) validation error. Includes info about infalid fields
 */
export class ValidationError extends Error {
  public readonly fields: ValidationErrorField[];

  public constructor(message: string = 'Validation Error', fields: ValidationErrorField[] = []) {
    super(message);
    this.name = this.constructor.name;
    this.fields = fields;

    if (CAN_SET_PROTOTYPE) {
      Object.setPrototypeOf(this, new.target.prototype);
    }
  }
}
