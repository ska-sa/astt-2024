import { CanActivateFn } from '@angular/router';
import { getUser } from '../signal';

export const userGuard: CanActivateFn = (route, state) => {
  return getUser() !== null;
};
