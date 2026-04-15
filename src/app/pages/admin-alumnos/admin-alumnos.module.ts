import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminAlumnosPageRoutingModule } from './admin-alumnos-routing.module';

import { AdminAlumnosPage } from './admin-alumnos.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminAlumnosPageRoutingModule
  ],
  declarations: [AdminAlumnosPage]
})
export class AdminAlumnosPageModule {}
