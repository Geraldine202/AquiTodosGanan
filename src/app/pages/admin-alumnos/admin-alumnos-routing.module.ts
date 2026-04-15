import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminAlumnosPage } from './admin-alumnos.page';

const routes: Routes = [
  {
    path: '',
    component: AdminAlumnosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminAlumnosPageRoutingModule {}
