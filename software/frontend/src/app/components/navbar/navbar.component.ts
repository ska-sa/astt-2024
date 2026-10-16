import { Component, OnInit, Signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { User } from '../../interfaces/user';
import { getUser, setUser, user } from '../../signal';

@Component({
  selector: 'app-navbar',
  imports: [
    NgClass,
    RouterModule
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {
  currentRoute: string = "";
  currentUser: Signal<User | null> = user;

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {}

  ngOnInit() {
    getUser();
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentRoute = this.activatedRoute.snapshot.url[0]?.path;
      }
    });
  }

  isActiveRoute(route: string): boolean {
    return this.currentRoute === route;
  }

  signOut(): void {
    setUser(null);
    this.router.navigate(["/sign-in"]);
    return;
  }
}
