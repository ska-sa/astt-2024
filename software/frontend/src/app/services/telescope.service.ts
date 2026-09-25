import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Telescope } from '../interfaces/telescope';
import { CreateTelescope } from '../interfaces/create-telescope';

@Injectable({
  providedIn: 'root'
})
export class TelescopeService {
  url: string = `http://${environment.host}:${environment.port}/api/v1/telescopes/`;
  httpHeaders: HttpHeaders = new HttpHeaders({
    'Content-Type': 'application/json'
  });

  constructor(private httpClient: HttpClient) { }

  getTelescopes(): Observable<Telescope[]> {
    return this.httpClient.get<Telescope[]>(this.url, { headers:  this.httpHeaders});
  }

  getTelescope(telescope_id: number): Observable<Telescope> {
    return this.httpClient.get<Telescope>(`${this.url}${telescope_id}`, { headers:  this.httpHeaders});
  }

  postTelescope(telescope: CreateTelescope): Observable<Telescope> {
    return this.httpClient.post<Telescope>(this.url, telescope, { headers: this.httpHeaders });
  }

  putTelescope(telescope: Telescope): Observable<Telescope> {
    return this.httpClient.put<Telescope>(`${this.url}${telescope.id}`, telescope, { headers: this.httpHeaders });
  }

  deleteTelescope(telescopeId: number): Observable<void> {
    return this.httpClient.delete<void>(`${this.url}${telescopeId}`, { headers: this.httpHeaders });
  }
}
