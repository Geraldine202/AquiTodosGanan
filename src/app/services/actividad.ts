import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interfaz sincronizada con los esquemas Pydantic de FastAPI
export interface ActividadPayload {
  nombre_actividad: string;
  descripcion: string;
  responsable_actividad: string;
  rut_usuario: string;
  id_tipo_actividad: number;
  id_estado_actividad?: number; // Opcional: FastAPI fuerza 1 (Programada) al crear
  id_sede: number;
  fecha_inicio: string;  // Formato ISO string
  fecha_termino: string; // Formato ISO string
  puntos: number;
  cupos: number;
  lugar: string;
  requisito?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ActividadService {

  private apiUrl: string = 'http://localhost:8000';

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  // ==========================================
  // CATÁLOGOS
  // ==========================================

  /** Obtiene docentes (id_tipo_usuario = 3) */
  getDocentes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/docentes`);
  }

  /** Obtiene tipos de actividad */
  getTiposActividad(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/tipos-actividad`);
  }

  /** Obtiene estados de actividad */
  getEstadosActividad(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/estados-actividad`);
  }

  /** Obtiene las sedes registradas */
  getSedes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/sedes`);
  }

  // ==========================================
  // CRUD DE ACTIVIDADES
  // ==========================================

  /** Obtiene la lista completa de actividades con relaciones anidadas */
  getActividades(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/actividades`);
  }

  /** Obtiene una actividad específica por su ID */
  getActividadPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/actividades/${id}`);
  }

  /** 
   * Crea una actividad.
   * FastAPI creará secuencialmente el registro principal e insertará
   * los datos correspondientes en 'calendario', 'puntaje_act', 'cupo_actividad', etc.
   */
  crearActividad(actividad: ActividadPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/actividades`, actividad, this.httpOptions);
  }

  /** Actualiza una actividad y sus tablas vinculadas */
  actualizarActividad(id: number, actividad: Partial<ActividadPayload>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/actividades/${id}`, actividad, this.httpOptions);
  }

  /** Elimina una actividad y limpia sus referencias en las 5 tablas secundarias */
  eliminarActividad(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/actividades/${id}`);
  }
}