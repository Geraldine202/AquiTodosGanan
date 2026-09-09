import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminPremiosPage } from './admin-premios.page';

const routes: Routes = [
  {
    path: '',
    component: AdminPremiosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminPremiosPageRoutingModule {}
