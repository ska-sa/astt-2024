import { Component, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { setUser } from '../../signal';

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

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {}

  ngOnInit() {
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
