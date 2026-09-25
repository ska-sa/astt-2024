import { Component, OnInit } from '@angular/core';
import { CommandService } from '../../services/command.service';
import { Command } from '../../interfaces/command';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
import { User } from '../../interfaces/user';
import { Telescope } from '../../interfaces/telescope';
import { TelescopeService } from '../../services/telescope.service';

@Component({
  selector: 'app-commands',
  imports: [CommonModule],
  templateUrl: './commands.component.html',
  styleUrl: './commands.component.css'
})
export class CommandsComponent implements OnInit {
  isLoading: boolean = false;

  commands: Command[] = [];
  users: User[] = [];
  telescopes: Telescope[] = [];
  userEmails: { [key: number]: string } = {};

  constructor(private commandService: CommandService, private userService: UserService, private telescopeService: TelescopeService) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadTelescopes();
    this.loadCommands();
    this.commands.forEach((command) => {
      this.userEmails[command.user_id] = this.users.find(u => u.id == command.user_id)?.email_address ?? 'Unknown User';
    });
  }

  loadCommands(): void {
    this.isLoading = true;
    this.commandService.getCommands().subscribe({
      next: (commands: Command[]) => {
        this.commands = commands;
        console.log('Commands loaded successfully:', commands);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading commands:', error);
        this.isLoading = false;
      }
    });
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService.getUsers().subscribe({
      next: (users: User[]) => {
        this.users = users;
        console.log('Users loaded successfully:', users);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.isLoading = false;
      }
    });
  }

    loadTelescopes(): void {
    this.isLoading = true;
    this.telescopeService.getTelescopes().subscribe({
      next: (telescopes: Telescope[]) => {
        this.telescopes = telescopes;
        console.log("Tescopes loaded successfully:", telescopes);
        this.isLoading = false;
      },
      error: (error: Error) => {
        console.log("Error loading telescope:", error);
        this.isLoading = false;
      }
    });
    return;
  }

  getTelescopeNameById(telescope_id: number): string {
    let telescopeName = "Unknown Telescope";
    let telescope: Telescope | undefined = this.telescopes.find(
      (telescope: Telescope) => {
        return telescope.id == telescope_id;
      }
    );
    if(telescope) {
      telescopeName = telescope.name;
    }
    return telescopeName;
  }

  getUserEmailById(userId: number): string {
    let userEmail = "Unknown User";
    const user = this.users.find(
      (user: User) => {
        return user.id === userId
      }
    );
    if (user) {
      userEmail = user.email_address;
    }
    return userEmail;
  }

  getCommandDetails(command: Command): string {
    if (command.command_type === 'point' && command.point) {
      return `Azimuth: ${command.point.target_az_angle}°, Elevation: ${command.point.target_el_angle}°`;
    }

    if (command.command_type === 'track' && command.track) {
      return `Source: ${command.track.source.name}`;
    }

    return '-';
  }
}
