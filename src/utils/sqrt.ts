import { ONE, SolidityType, THREE, TWO, ZERO } from '../constants/constants';
import JSBI from 'jsbi';
import { validateSolidityTypeInstance } from './validate-solidity-type-instance';

/**
 * Mock the on-chain sqrt function
 * @param y
 */
export function sqrt(y: JSBI): JSBI {
  validateSolidityTypeInstance(y, SolidityType.uint256);
  let z: JSBI = ZERO;
  let x: JSBI;
  if (JSBI.greaterThan(y, THREE)) {
    z = y;
    x = JSBI.add(JSBI.divide(y, TWO), ONE);
    while (JSBI.lessThan(x, z)) {
      z = x;
      x = JSBI.divide(JSBI.add(JSBI.divide(y, x), x), TWO);
    }
  } else if (JSBI.notEqual(y, ZERO)) {
    z = ONE;
  }
  return z;
}
