import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminActividadesPageRoutingModule } from './admin-actividades-routing.module';

import { AdminActividadesPage } from './admin-actividades.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminActividadesPageRoutingModule
  ],
  declarations: [AdminActividadesPage]
})
export class AdminActividadesPageModule {}
