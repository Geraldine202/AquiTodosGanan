import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone:false
})
export class HomePage implements OnInit {

   nombreSistema: string = 'Sistema de Gestión Académica';

  constructor() { }

  ngOnInit() {
  }

}
