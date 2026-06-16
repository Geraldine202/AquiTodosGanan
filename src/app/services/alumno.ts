import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AlumnoService {
  private apiUrl = 'http://localhost:3000/alumnos';
  // NUEVA URL: Apunta al endpoint de autenticación de tu backend en Node.js
  private authUrl = 'http://localhost:3000/auth'; 

  constructor(private http: HttpClient) { }

  getAlumnos(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  addAlumno(alumno: any): Observable<any> {
    return this.http.post(this.apiUrl, alumno);
  }

  editAlumno(rut: string, alumno: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${rut}`, alumno);
  }

  deleteAlumno(rut: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${rut}`);
  }

  // ==========================================
  // NUEVOS MÉTODOS PARA HACER FUNCIONAR TU LOGIN
  // ==========================================

  // Envía el correo y la contraseña a tu backend Express
  login(credenciales: any): Observable<any> {
    return this.http.post(`${this.authUrl}/login`, credenciales);
  }

  // Guarda los datos del usuario que inició sesión en el almacenamiento local
  guardarSesion(usuario: any) {
    localStorage.setItem('usuarioLogueado', JSON.stringify(usuario));
  }

  // Obtiene el usuario que está actualmente conectado (por si lo necesitas en el Home)
  obtenerUsuarioSesion() {
    const user = localStorage.getItem('usuarioLogueado');
    return user ? JSON.parse(user) : null;
  }
}