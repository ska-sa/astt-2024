import { Component } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';
import { TelescopesComponent } from '../telescopes/telescopes.component';

@Component({
  selector: 'app-home',
  imports: [NavbarComponent, TelescopesComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {

}
