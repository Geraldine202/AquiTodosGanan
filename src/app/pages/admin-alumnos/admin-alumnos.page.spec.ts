import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminAlumnosPage } from './admin-alumnos.page';

describe('AdminAlumnosPage', () => {
  let component: AdminAlumnosPage;
  let fixture: ComponentFixture<AdminAlumnosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminAlumnosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
