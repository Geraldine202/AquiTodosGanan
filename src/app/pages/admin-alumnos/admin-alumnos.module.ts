import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminAlumnosPageRoutingModule } from './admin-alumnos-routing.module';

import { AdminAlumnosPage } from './admin-alumnos.page';
import { FooterComponent } from 'src/app/components/footer/footer.component';
import { HeaderComponent } from 'src/app/components/header/header.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminAlumnosPageRoutingModule,
        FooterComponent,
        HeaderComponent
  ],
  declarations: [AdminAlumnosPage]
})
export class AdminAlumnosPageModule {}
