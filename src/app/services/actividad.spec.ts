import { TestBed } from '@angular/core/testing';

import { Actividad } from './actividad';

describe('Actividad', () => {
  let service: Actividad;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Actividad);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
