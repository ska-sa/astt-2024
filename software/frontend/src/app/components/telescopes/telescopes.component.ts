import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Telescope } from '../../interfaces/telescope';
import { FormsModule } from '@angular/forms';
import { TelescopeService } from '../../services/telescope.service';
import { CreateTelescope } from '../../interfaces/create-telescope';

@Component({
  selector: 'app-telescopes',
  imports: [
    RouterOutlet,
    CommonModule,
    FormsModule,
  ],
  templateUrl: './telescopes.component.html',
  styleUrl: './telescopes.component.css'
})
export class TelescopesComponent implements OnInit{
  isLoading: boolean = true;
  telescopes: Telescope[] = [];

  newTelescopeName: string = "";

  constructor(private router: Router, private telescopeService: TelescopeService) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.loadTelescopes();
    return;
  }

  loadTelescopes(): void {
    this.telescopeService.getTelescopes().subscribe({
      next: (telescopes: Telescope[]) => {
        this.telescopes = telescopes;
        console.log(`Telescopes: ${telescopes}`);
        this.isLoading = false;
      },
      error: (err: Error) => {
        console.error(err);
        this.isLoading = false;
      }
    });
   return;
  }

  addTelescope(): void {
    this.isLoading = true;
    if (this.newTelescopeName.trim() === "") {
      console.error("Telescope name cannot be empty");
      this.isLoading = false;
      return;
    }
    if (this.telescopes.some(telescope => telescope.name === this.newTelescopeName)) {
      console.error(`Telescope with name ${this.newTelescopeName} already exists`);
      this.isLoading = false;
      return;
    }
    const newTelescope: CreateTelescope = {
      name: this.newTelescopeName,
      health_status: "OK",
    };
    this.telescopeService.postTelescope(newTelescope).subscribe({
      next: (telescope: Telescope) => {
        console.log(`Telescope added: ${telescope}`); 
        this.telescopes.push(telescope);
        this.isLoading = false;
      },
      error: (err: Error) => {
        console.error(`Error adding telescope: ${err}`);
        this.isLoading = false;
      }
    });
    return;
  }

  controlTelescope(telescopeId: number): void {
    this.router.navigate(["/telescopes", telescopeId, "cam"]);
    return;
  }

  editTelescope(name: string): void {
    let telescopeToEdit = this.telescopes.find(telescope => telescope.name === name);
    if (telescopeToEdit) {
      const newName = prompt("Enter new name for the telescope:", telescopeToEdit.name);
      if (!newName || newName.trim() === "") {
        console.error("Telescope name cannot be empty");
        return;
      }
      if (this.telescopes.some(telescope => telescope.name === newName && telescope.id !== telescopeToEdit.id)) {
        console.error(`Telescope with name ${newName} already exists`);
        return;
      }
      telescopeToEdit.name = newName;
      this.isLoading = true;
      this.telescopeService.putTelescope(telescopeToEdit).subscribe({
        next: (updatedTelescope: Telescope) => {
          console.log(`Telescope updated: ${updatedTelescope}`);
          const index = this.telescopes.findIndex(telescope => telescope.id === updatedTelescope.id);
          if (index !== -1) {
            this.telescopes[index] = updatedTelescope;
          }
        },
        error: (err: Error) => {
          console.error(`Error updating telescope: ${err}`);
        }
      });
    }
    this.isLoading = false;
    return;
  }

  deleteTelescope(telescopeName: string): void {
    const telescopeToDelete = this.telescopes.find(telescope => telescope.name === telescopeName);
    if (telescopeToDelete) {
      this.isLoading = true;
      this.telescopeService.deleteTelescope(telescopeToDelete.id).subscribe({
        next: () => {
          console.log(`Telescope deleted: ${telescopeName}`);
          this.telescopes = this.telescopes.filter(telescope => telescope.id !== telescopeToDelete.id);
          this.isLoading = false;
        },
        error: (err: Error) => {
          console.error(`Error deleting telescope: ${err}`);
          this.isLoading = false;
        }
      });
    }
  return;
  }
}

