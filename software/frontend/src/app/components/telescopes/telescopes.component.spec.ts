import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { TelescopesComponent } from './telescopes.component';
import { TelescopeService } from '../../services/telescope.service';
import { ReadingService } from '../../services/reading.service';
import { Telescope } from '../../interfaces/telescope';
import { Reading } from '../../interfaces/reading';

describe('TelescopesComponent', () => {
  let component: TelescopesComponent;
  let fixture: ComponentFixture<TelescopesComponent>;
  let telescopeService: jasmine.SpyObj<TelescopeService>;
  let readingService: jasmine.SpyObj<ReadingService>;
  const telescope: Telescope = { id: 7, name: 'Test antenna', health_status: 'OK', created_at: new Date() };

  function sensorReading(overrides: Partial<Reading> = {}): Reading {
    return {
      id: 101, telescope_id: 7, created_at: new Date(Date.now() - 1000).toISOString(),
      azimuth_angle: 180, elevation_angle: 45,
      latitude: 0, longitude: 0, altitude: 0,
      gyroscope_x: 0, gyroscope_y: 0, gyroscope_z: 0,
      acceleration_x: 0, acceleration_y: 0, acceleration_z: 0,
      magnetic_field_x: 0, magnetic_field_y: 0, magnetic_field_z: 0,
      health_status: 'DEGRADED', movement_status: 'IDLE', ...overrides
    };
  }

  beforeEach(async () => {
    telescopeService = jasmine.createSpyObj<TelescopeService>('TelescopeService', ['getTelescopes', 'postTelescope', 'putTelescope', 'deleteTelescope']);
    readingService = jasmine.createSpyObj<ReadingService>('ReadingService', ['getLatestReading']);
    telescopeService.getTelescopes.and.returnValue(of([telescope]));
    readingService.getLatestReading.and.returnValue(of(sensorReading()));
    await TestBed.configureTestingModule({
      imports: [TelescopesComponent],
      providers: [
        provideRouter([]),
        { provide: TelescopeService, useValue: telescopeService },
        { provide: ReadingService, useValue: readingService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TelescopesComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows each device actual reading health and freshness instead of the stored telescope status', fakeAsync(() => {
    telescopeService.getTelescopes.and.returnValue(of([telescope, { ...telescope, id: 8, name: 'Second antenna' }]));
    readingService.getLatestReading.and.callFake((id: number) => of(sensorReading({ telescope_id: id, health_status: id === 7 ? 'DEGRADED' : 'FAULT' })));
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.text-warning')?.textContent).toBe('DEGRADED');
    expect(element.querySelector('.text-danger')?.textContent).toBe('FAULT');
    expect(element.querySelectorAll('tr.table-secondary').length).toBe(0);
    expect(element.querySelector('.badge')).toBeNull();
    expect(element.textContent).toContain('Last seen:');
    expect(element.textContent).not.toContain('Online');
    expect(element.textContent).not.toContain('Offline');
    expect(element.textContent).not.toContain('Not available');
    expect(readingService.getLatestReading).toHaveBeenCalledWith(7);
    expect(readingService.getLatestReading).toHaveBeenCalledWith(8);
    expect(telescope.health_status).toBe('OK');
    expect(telescopeService.putTelescope).not.toHaveBeenCalled();
    component.ngOnDestroy();
  }));

  it('treats UTC timestamps consistently and rejects stale, future, missing, or malformed times', () => {
    const timestamp: string = new Date(Date.now() - 1000).toISOString();
    component.latestReadings[7] = sensorReading({ created_at: timestamp.replace('T', ' ').replace('Z', '') });
    expect(component.getLastActiveAt(7)?.toISOString()).toBe(timestamp);
    expect(component.isDeviceOnline(7)).toBeTrue();

    for (const created_at of [null, '', 'invalid', new Date(Date.now() - 20000).toISOString(), new Date(Date.now() + 60000).toISOString()]) {
      component.latestReadings[7] = sensorReading({ created_at });
      expect(component.isDeviceOnline(7)).toBeFalse();
    }
    expect(component.isDeviceOnline(8)).toBeFalse();
    expect(component.getLastActiveAt(8)).toBeNull();
  });

  it('grays a device with no reading without adding an offline label or showing its default OK', fakeAsync(() => {
    readingService.getLatestReading.and.returnValue(throwError(() => new Error('No readings')));
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.text-secondary')?.textContent).toBe('Unknown');
    expect(element.querySelectorAll('tr.table-secondary').length).toBe(1);
    expect(element.textContent).not.toContain('Offline');
    expect(element.textContent).not.toContain('Online');
    expect(element.textContent).toContain('Last seen: Not available');
    expect(component.isDeviceOnline(7)).toBeFalse();
    component.ngOnDestroy();
  }));

  it('does not overlap a pending device fetch and refreshes after it completes', fakeAsync(() => {
    const response: Subject<Reading> = new Subject<Reading>();
    readingService.getLatestReading.and.returnValue(response);
    fixture.detectChanges();
    tick(2000);
    expect(readingService.getLatestReading).toHaveBeenCalledTimes(1);
    response.next(sensorReading());
    response.complete();
    readingService.getLatestReading.and.returnValue(of(sensorReading({ id: 102, health_status: 'FAULT' })));

    tick(1000);

    expect(readingService.getLatestReading).toHaveBeenCalledTimes(2);
    expect(component.latestReadings[7]?.id).toBe(102);
    expect(component.getHealthStatusClass(7)).toBe('text-danger');
    component.ngOnDestroy();
  }));

  it('keeps the last known reading on API failure but marks it offline until recovery', fakeAsync(() => {
    fixture.detectChanges();
    const lastActive: string | undefined = component.getLastActiveAt(7)?.toISOString();
    readingService.getLatestReading.and.returnValue(throwError(() => new Error('Backend unavailable')));

    tick(1000);

    expect(component.isDeviceOnline(7)).toBeFalse();
    expect(component.latestReadings[7]?.health_status).toBe('DEGRADED');
    expect(component.getLastActiveAt(7)?.toISOString()).toBe(lastActive);
    readingService.getLatestReading.and.returnValue(of(sensorReading({ health_status: 'OK' })));
    tick(1000);
    expect(component.isDeviceOnline(7)).toBeTrue();
    expect(component.getHealthStatusClass(7)).toBe('text-success');
    component.ngOnDestroy();
  }));

  it('ignores a reading belonging to another device', fakeAsync(() => {
    readingService.getLatestReading.and.returnValue(of(sensorReading({ telescope_id: 8 })));
    fixture.detectChanges();

    expect(component.latestReadings[7]).toBeUndefined();
    expect(component.isDeviceOnline(7)).toBeFalse();
    component.ngOnDestroy();
  }));

  it('cancels polling and pending reading work on destruction', fakeAsync(() => {
    const response: Subject<Reading> = new Subject<Reading>();
    readingService.getLatestReading.and.returnValue(response);
    fixture.detectChanges();

    component.ngOnDestroy();
    response.next(sensorReading());
    tick(3000);

    expect(readingService.getLatestReading).toHaveBeenCalledTimes(1);
    expect(component.latestReadings[7]).toBeUndefined();
  }));
});
