import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CambiarClaveObligatorioPage } from './cambiar-clave-obligatorio.page';

describe('CambiarClaveObligatorioPage', () => {
  let component: CambiarClaveObligatorioPage;
  let fixture: ComponentFixture<CambiarClaveObligatorioPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CambiarClaveObligatorioPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
