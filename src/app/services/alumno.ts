import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AlumnoService {
  private apiUrl = 'http://localhost:3000/alumnos';

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
    // CORREGIDO: Solo un return y usando .delete()
    return this.http.delete(`${this.apiUrl}/${rut}`);
  }
}