import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Source } from '../interfaces/source';
import { CreateSource } from '../interfaces/create-source';

@Injectable({
  providedIn: 'root'
})
export class SourceService {

  url: string = `http://${environment.host}:${environment.port}/api/v1`;

  constructor(private httpClient: HttpClient) { }

  httpHeaders: HttpHeaders = new HttpHeaders({
    'Content-Type': 'application/json'
  });

  getSources(): Observable<Source[]> {
    return this.httpClient.get<Source[]>(`${this.url}/sources`, { headers: this.httpHeaders });
  }

  postSource(createSource: CreateSource): Observable<Source> {
    return this.httpClient.post<Source>(`${this.url}/sources`, createSource, { headers: this.httpHeaders });
  }

  updateSource(id: number, source: Source): Observable<Source> {
    return this.httpClient.put<Source>(`${this.url}/sources/${id}`, source, { headers: this.httpHeaders });
  }

  deleteSource(id: number): Observable<Source> {
    return this.httpClient.delete<Source>(`${this.url}/sources/${id}`, { headers: this.httpHeaders });
  }
}