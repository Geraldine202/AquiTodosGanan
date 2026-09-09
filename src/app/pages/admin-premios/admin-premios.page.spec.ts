import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminPremiosPage } from './admin-premios.page';

describe('AdminPremiosPage', () => {
  let component: AdminPremiosPage;
  let fixture: ComponentFixture<AdminPremiosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminPremiosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
