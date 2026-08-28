import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// ==========================================
// INTERFACES Y MODELOS
// ==========================================

/** Payload necesario para Crear o Actualizar una Actividad */
export interface ActividadPayload {
  nombre_actividad: string;
  descripcion: string;
  responsable_actividad: string;
  rut_usuario: string;
  id_tipo_actividad: number;
  id_estado_actividad?: number; // Opcional (FastAPI asigna 1 por defecto al crear)
  id_sede: number;
  fecha_inicio: string;  // Formato ISO string (ej: "2026-05-10T14:30:00")
  fecha_termino: string; // Formato ISO string
  puntos: number;
  cupos: number;
  lugar: string;
  requisito?: string;
  img_actv?: string;     // URL pública devuelta por el backend
}

/** Interfaz para ítems de catálogos simples (Sedes, Tipos, Estados) */
export interface CatalogoItem {
  id_tipo_actividad?: number;
  id_estado_actividad?: number;
  id_sede?: number;
  descripcion: string;
}

/** Interfaz para el catálogo de Docentes/Usuarios */
export interface Docente {
  rut_usuario: string;
  nombre_completo: string;
  correo: string;
  id_tipo_usuario: number;
}

/** Respuesta completa de Actividad enviada por la API (con relaciones) */
export interface ActividadCompleta {
  id_actividad: number;
  nombre_actividad: string;
  descripcion: string;
  responsable_actividad: string;
  fecha_inicio: string;
  fecha_termino: string;
  id_tipo_actividad: number;
  id_estado_actividad: number;
  id_sede: number;
  rut_usuario: string;
  img_actv?: string;
  tipo_actividad?: { descripcion: string };
  estado_actividad?: { descripcion: string };
  sede?: { descripcion: string };
  usuario?: { nombre_completo: string; correo: string };
  puntaje_act?: Array<{ id_puntaje: number; cantidad: number; fecha_vencimiento: string }>;
  cupo_actividad?: Array<{ id_cupo: number; cantidad: number }>;
  lugar_actividad?: Array<{ id_lugar_actividad: number; descripcion: string }>;
  requisito_participacion?: Array<{ id_requisito: number; descripcion: string }>;
  calendario?: Array<{ id_calendario: number; fecha: string; hora: string; lugar: string }>;
}

@Injectable({
  providedIn: 'root',
})
export class ActividadService {

  // URL base de tu backend FastAPI (puedes mover esto a src/environments/environment.ts)
  private apiUrl: string = 'http://localhost:8000';

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  // ==========================================
  // ARCHIVOS / ALMACENAMIENTO DE IMÁGENES
  // ==========================================

  /**
   * Sube una imagen al backend (FastAPI) para ser alojada en Supabase Storage.
   * Retorna la URL pública generada.
   */
  subirImagen(file: File): Observable<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    // No se pasa 'httpOptions' para que el navegador establezca automáticamente
    // el Content-Type multipart/form-data con el boundary.
    return this.http.post<{ url: string; filename: string }>(`${this.apiUrl}/upload-imagen`, formData);
  }

  // ==========================================
  // CATÁLOGOS
  // ==========================================

  /** Obtiene docentes responsables (id_tipo_usuario = 3) */
  getDocentes(): Observable<Docente[]> {
    return this.http.get<Docente[]>(`${this.apiUrl}/docentes`);
  }

  /** Obtiene tipos de actividad (ej: Deportiva, Académica, etc.) */
  getTiposActividad(): Observable<CatalogoItem[]> {
    return this.http.get<CatalogoItem[]>(`${this.apiUrl}/tipos-actividad`);
  }

  /** Obtiene estados de la actividad (ej: Programada, Finalizada) */
  getEstadosActividad(): Observable<CatalogoItem[]> {
    return this.http.get<CatalogoItem[]>(`${this.apiUrl}/estados-actividad`);
  }

  /** Obtiene las sedes disponibles */
  getSedes(): Observable<CatalogoItem[]> {
    return this.http.get<CatalogoItem[]>(`${this.apiUrl}/sedes`);
  }

  // ==========================================
  // CRUD DE ACTIVIDADES
  // ==========================================

  /** Obtiene el listado completo de actividades con sus datos anidados */
  getActividades(): Observable<ActividadCompleta[]> {
    return this.http.get<ActividadCompleta[]>(`${this.apiUrl}/actividades`);
  }

  /** Obtiene una actividad específica según su ID */
  getActividadPorId(id: number): Observable<ActividadCompleta> {
    return this.http.get<ActividadCompleta>(`${this.apiUrl}/actividades/${id}`);
  }

  /**
   * Registra una nueva actividad.
   * La API creará el registro principal e insertará automáticamente
   * los registros vinculados (puntos, cupos, lugar, calendario, etc.).
   */
  crearActividad(actividad: ActividadPayload): Observable<ActividadCompleta> {
    return this.http.post<ActividadCompleta>(`${this.apiUrl}/actividades`, actividad, this.httpOptions);
  }

  /** 
   * Actualiza una actividad existente y sus tablas hijas.
   * Si 'img_actv' cambia, el backend eliminará la imagen anterior del Storage.
   */
  actualizarActividad(id: number, actividad: Partial<ActividadPayload>): Observable<ActividadCompleta> {
    return this.http.put<ActividadCompleta>(`${this.apiUrl}/actividades/${id}`, actividad, this.httpOptions);
  }

  /** 
   * Elimina una actividad, sus referencias asociadas y limpia la imagen del Storage.
   */
  eliminarActividad(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/actividades/${id}`);
  }
}