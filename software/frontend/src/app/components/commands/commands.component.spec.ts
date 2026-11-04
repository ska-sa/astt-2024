import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommandsComponent } from './commands.component';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Command } from '../../interfaces/command';

describe('CommandsComponent', () => {
  let component: CommandsComponent;
  let fixture: ComponentFixture<CommandsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommandsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommandsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).match(() => true).forEach(request => request.flush([]));
  });

  it('shows Point commands with signed UI angles while retaining their API target', () => {
    const command: Command = { id: 1, user_id: 1, telescope_id: 7, created_at: new Date(), command_type: 'point', point: { target_az_angle: 275, target_el_angle: 330 }, track: null };
    expect(component.getCommandDetails(command)).toBe('Azimuth: -85°, Elevation: -30°');
    expect(command.point?.target_az_angle).toBe(275);
    expect(command.point?.target_el_angle).toBe(330);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
