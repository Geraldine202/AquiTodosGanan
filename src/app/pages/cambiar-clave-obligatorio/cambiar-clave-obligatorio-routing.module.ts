import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CambiarClaveObligatorioPage } from './cambiar-clave-obligatorio.page';

const routes: Routes = [
  {
    path: '',
    component: CambiarClaveObligatorioPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CambiarClaveObligatorioPageRoutingModule {}
