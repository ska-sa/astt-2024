import { TestBed } from '@angular/core/testing';

import { TelescopeService } from './telescope.service';

describe('TelescopeService', () => {
  let service: TelescopeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TelescopeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
