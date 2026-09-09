import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminPremiosPageRoutingModule } from './admin-premios-routing.module';

import { AdminPremiosPage } from './admin-premios.page';
import { FooterComponent } from 'src/app/components/footer/footer.component';
import { HeaderComponent } from 'src/app/components/header/header.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
            FooterComponent,
            HeaderComponent,
    AdminPremiosPageRoutingModule
  ],
  declarations: [AdminPremiosPage]
})
export class AdminPremiosPageModule {}
