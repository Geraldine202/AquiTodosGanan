import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { ActividadService, SolicitudCanje } from 'src/app/services/actividad';

@Component({
  selector: 'app-admin-canjes',
  templateUrl: './admin-canjes.page.html',
  styleUrls: ['./admin-canjes.page.scss'],
  standalone: false
})
export class AdminCanjesPage implements OnInit {
  solicitudes: SolicitudCanje[] = [];
  solicitudesFiltradas: SolicitudCanje[] = [];
  
  filtroEstado: string = 'todos';
  busqueda: string = '';
  cargando: boolean = false;

  constructor(
    private actividadService: ActividadService,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    this.cargarSolicitudes();
  }

  ionViewWillEnter() {
    this.cargarSolicitudes();
  }

cargarSolicitudes(event?: any) {
  this.cargando = true;
  this.actividadService.obtenerCanjes().subscribe({
    next: (data: any[]) => {
      this.solicitudes = data.map(item => {
        // 1. Obtener la información del Usuario
        const usr = Array.isArray(item.usuario) ? item.usuario[0] : item.usuario;
        const idSedeUsuario = usr?.id_sede ? Number(usr.id_sede) : null;

        // Nombre de la sede del usuario
        let nombreSedeUsuario = '';
        if (usr?.sede) {
          const sObj = Array.isArray(usr.sede) ? usr.sede[0] : usr.sede;
          nombreSedeUsuario = sObj?.descripcion || '';
        }

        // 2. Obtener la información del Nivel del Estudiante
        const infoNivelAlumno = item.info_nivel_usuario || {
          id_nivel: 1,
          nombre_nivel: 'Bronce',
          total_actividades: 0,
          faltantes_siguiente: 4
        };

        // 3. Obtener la información del Premio, su Nivel, Categoría y Stock
        const premioObj = Array.isArray(item.premio) ? item.premio[0] : item.premio;
        
        // Extracción del objeto Nivel del premio
        const nivelObj = Array.isArray(premioObj?.nivel) ? premioObj.nivel[0] : premioObj?.nivel;
        const idNivelPremio = premioObj?.id_nivel ? Number(premioObj.id_nivel) : (nivelObj?.id_nivel ? Number(nivelObj.id_nivel) : 1);
        const nombreNivelPremio = nivelObj?.nombre_nivel || (idNivelPremio === 3 ? 'Platino' : (idNivelPremio === 2 ? 'Oro' : 'Bronce'));

        // Extracción del objeto Categoría del premio
        const catObj = Array.isArray(premioObj?.categoria_premio) ? premioObj.categoria_premio[0] : premioObj?.categoria_premio;

        // Procesamiento de Stock por Sede
        let stocks: any[] = premioObj?.stock_sede || [];
        if (stocks && !Array.isArray(stocks)) {
          stocks = [stocks];
        }

        // 4. Buscar el stock real correspondiente a la sede del alumno
        let stockEncontrado = 0;

        if (Array.isArray(stocks) && stocks.length > 0) {
          let registro = stocks.find((s: any) => Number(s.id_sede) === idSedeUsuario);

          if (!registro && premioObj?.id_sede && Number(premioObj.id_sede) === idSedeUsuario) {
            registro = stocks.find((s: any) => Number(s.id_sede) === Number(premioObj.id_sede));
          }

          if (!registro && stocks.length === 1) {
            registro = stocks[0];
          }

          if (registro) {
            stockEncontrado = Number(registro.cantidad);
          }
        }

        return {
          ...item,
          usuario: usr,
          info_nivel_usuario: infoNivelAlumno,
          premio: {
            ...premioObj,
            id_nivel: idNivelPremio,
            nombre_nivel: nombreNivelPremio,
            nivel: nivelObj || { id_nivel: idNivelPremio, nombre_nivel: nombreNivelPremio, min_actividades: 0 },
            categoria_premio: catObj
          },
          nombre_sede_alumno: nombreSedeUsuario || 'Puente Alto',
          stock_sede_alumno: stockEncontrado
        };
      });

      this.aplicarFiltros();
      this.cargando = false;
      if (event) event.target.complete();
    },
    error: (err) => {
      console.error('[ERROR CARGAR CANJES]:', err);
      const msg = err.error?.detail || 'Error al cargar las solicitudes de canje';
      this.mostrarToast(msg, 'danger');
      this.cargando = false;
      if (event) event.target.complete();
    }
  });
}

  aplicarFiltros() {
    this.solicitudesFiltradas = this.solicitudes.filter(item => {
      const cumpleEstado = this.filtroEstado === 'todos' || item.id_estado_canje === Number(this.filtroEstado);
      const termino = this.busqueda.toLowerCase().trim();
      
      const nombreAlumno = item.usuario?.nombre_completo ? item.usuario.nombre_completo.toLowerCase() : '';
      const descripcionPremio = item.premio?.descripcion ? item.premio.descripcion.toLowerCase() : '';
      const nombreNivel = item.premio?.nombre_nivel ? item.premio.nombre_nivel.toLowerCase() : '';
      const rut = item.rut_usuario ? item.rut_usuario.toLowerCase() : '';

      return cumpleEstado && (
        termino === '' || 
        rut.includes(termino) || 
        nombreAlumno.includes(termino) || 
        descripcionPremio.includes(termino) ||
        nombreNivel.includes(termino)
      );
    });
  }

  // Acciones: Aprobar Solicitud (1 -> 2)
  async aprobarCanje(item: SolicitudCanje) {
    const nivelPremio = item.premio?.nombre_nivel || 'Bronce';
    const alert = await this.alertController.create({
      header: 'Aprobar Solicitud',
      message: `¿Confirmas la aprobación para "${item.premio?.descripcion || 'el premio'}" (Nivel ${nivelPremio})? En este momento se re-validará el nivel del alumno, se descontarán ${item.costo_puntaje} pts y 1 unidad del stock de la sede.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sí, Aprobar',
          handler: () => {
            this.ejecutarAccion(
              this.actividadService.aprobarCanje(item.id_canje)
            );
          }
        }
      ]
    });
    await alert.present();
  }

  // Acciones: Confirmar Entrega Presencial (2 -> 3)
  async marcarComoRetirado(item: SolicitudCanje) {
    const alert = await this.alertController.create({
      header: 'Confirmar Entrega Presencial',
      message: `¿El estudiante ${item.usuario?.nombre_completo || item.rut_usuario} ha retirado su premio "${item.premio?.descripcion || ''}" en DAE presencialmente? Se enviará un correo de confirmación de entrega al estudiante.`,
      buttons: [
        { text: 'Volver', role: 'cancel' },
        {
          text: 'Confirmar Entrega',
          handler: () => {
            this.ejecutarAccion(
              this.actividadService.marcarComoRetirado(item.id_canje)
            );
          }
        }
      ]
    });
    await alert.present();
  }

  // Acciones: Rechazar o Cancelar (1 u 2 -> 4)
  async cancelarPorStock(item: SolicitudCanje) {
    const esSolicitudPendiente = item.id_estado_canje === 1;
    
    const mensaje = esSolicitudPendiente
      ? `¿Rechazar esta solicitud? Como aún no se han descontado puntos, la solicitud cambiará a estado Rechazado y se notificará por correo al estudiante.`
      : `¿Cancelar este canje aprobado? Se devolverán ${item.costo_puntaje} pts al estudiante, se reincorporará la unidad al stock de la sede y se enviará la notificación por correo.`;

    const alert = await this.alertController.create({
      header: esSolicitudPendiente ? 'Rechazar Solicitud' : 'Cancelar Canje Aprobado',
      message: mensaje,
      buttons: [
        { text: 'Volver', role: 'cancel' },
        {
          text: esSolicitudPendiente ? 'Rechazar Solicitud' : 'Cancelar y Reembolsar',
          role: 'destructive',
          handler: () => {
            this.ejecutarAccion(
              this.actividadService.cancelarPorStock(item.id_canje)
            );
          }
        }
      ]
    });
    await alert.present();
  }

  private async ejecutarAccion(peticion$: any) {
    const loader = await this.loadingController.create({ message: 'Procesando...' });
    await loader.present();

    peticion$.subscribe({
      next: (res: any) => {
        loader.dismiss();
        this.mostrarToast(res.message || 'Operación realizada con éxito', 'success');
        this.cargarSolicitudes();
      },
      error: (err: any) => {
        loader.dismiss();
        const errorMsg = err.error?.detail || 'Ocurrió un error al procesar la solicitud';
        this.mostrarToast(errorMsg, 'danger');
      }
    });
  }

  private async mostrarToast(mensaje: string, color: string = 'dark') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3500,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }
}