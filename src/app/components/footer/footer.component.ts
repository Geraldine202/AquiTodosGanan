import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular'; // 1. Importa IonicModule

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  standalone: true,
  imports: [
    IonicModule // 2. Agrégalo aquí para que reconozca ion-button, ion-icon, etc.
  ]
})
export class FooterComponent implements OnInit {

  constructor() { }

  ngOnInit() {}

}