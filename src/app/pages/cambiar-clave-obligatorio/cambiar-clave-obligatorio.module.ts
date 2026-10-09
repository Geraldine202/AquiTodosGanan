import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CambiarClaveObligatorioPageRoutingModule } from './cambiar-clave-obligatorio-routing.module';

import { CambiarClaveObligatorioPage } from './cambiar-clave-obligatorio.page';
import { FooterComponent } from 'src/app/components/footer/footer.component';
import { HeaderComponent } from 'src/app/components/header/header.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CambiarClaveObligatorioPageRoutingModule,
    FooterComponent,
    HeaderComponent
  ],
  declarations: [CambiarClaveObligatorioPage]
})
export class CambiarClaveObligatorioPageModule {}
