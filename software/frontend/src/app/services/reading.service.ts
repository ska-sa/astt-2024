import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Reading } from '../interfaces/reading';
import { CreateReading } from '../interfaces/create-reading';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReadingService {
  url: string = `http://${environment.host}:${environment.port}/api/v1/readings/`;
  httpHeaders: HttpHeaders = new HttpHeaders({
    'Content-Type': 'application/json'
  });

  constructor(private httpClient: HttpClient) { }

  getReadings(): Observable<Reading[]> {
    return this.httpClient.get<Reading[]>(this.url, { headers: this.httpHeaders });
  }

  getLatestReading(telescope_id: number): Observable<Reading> {
    return this.httpClient.get<Reading>(`${this.url}${telescope_id}/latest`, { headers: this.httpHeaders });
  }

  getReadingsInRange(telescopeId: number, start: string, end: string): Observable<Reading[]> {
    const params: HttpParams = new HttpParams()
      .set('start', start)
      .set('end', end);

    return this.httpClient.get<Reading[]>(`${this.url}${telescopeId}/range`, {
      headers: this.httpHeaders,
      params
    });
  }

  postReading(createReading: CreateReading) {
    return this.httpClient.post<Reading>(this.url, createReading, { headers: this.httpHeaders });
  }
}
