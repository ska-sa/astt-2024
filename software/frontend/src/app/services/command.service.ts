import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Command } from '../interfaces/command';
import { CreateCommand } from '../interfaces/create-command';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommandService {
  url: string = `http://${environment.host}:${environment.port}/api/v1/commands/`;
  httpHeaders: HttpHeaders = new HttpHeaders({
    'Content-Type': 'application/json'
  });

  constructor(private httpClient: HttpClient) { }

  getCommands(): Observable<Command[]> {
    return this.httpClient.get<Command[]>(this.url, { headers: this.httpHeaders });
  }

  postCommand(createCommand: CreateCommand) {
    return this.httpClient.post<Command>(this.url, createCommand, { headers: this.httpHeaders });
  }
}
