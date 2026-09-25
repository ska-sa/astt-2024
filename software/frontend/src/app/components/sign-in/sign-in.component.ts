import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../services/user.service';
import { User } from '../../interfaces/user';
import { CommonModule } from '@angular/common';
import { setUser } from '../../signal';

@Component({
  selector: 'app-sign-in',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.css'
})
export class SignInComponent {
  signInForm: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private userService: UserService,
    private router: Router
  ) {
    this.signInForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.signInForm.valid) {
      this.router.navigate(['/telescopes']);
      const { email, password } = this.signInForm.value;
      this.userService.signIn(email, password).subscribe({
        next: (user: User) => {
          console.log('User signed in successfully:', user);
          setUser(user);
          this.router.navigate(['/telescopes']);
        },
        error: (error) => {
          // Handle the error
          console.error('Sign-in error:', error);
        }
      });
    }
  }
}
