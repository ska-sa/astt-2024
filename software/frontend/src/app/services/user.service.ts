import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../interfaces/user';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  url: string = `http://${environment.host}:${environment.port}/api/v1/users`

  constructor(private httpClient: HttpClient) { }

  httpHeaders: HttpHeaders = new HttpHeaders({
    'Content-Type': 'application/json'
  });

  getUser(userId: number): Observable<User> {
    return this.httpClient.get<User>(`${this.url}/${userId}`, { headers: this.httpHeaders });
  }

  getUsers(): Observable<User[]> {
    return this.httpClient.get<User[]>(`${this.url}/`, { headers: this.httpHeaders });
  }

  signIn(email_address: string, password: string): Observable<User> {
    const user_data = {
      email_address: email_address,
      password: password
    }
    return this.httpClient.post<User>(`${this.url}/auth`, user_data, { headers: this.httpHeaders });
  }

  signUp(email_address: string, password: string): Observable<User> {
    const user_data = {
      email_address: email_address,
      password: password
    }
    return this.httpClient.post<User>(this.url, user_data, { headers: this.httpHeaders });
  }

}
