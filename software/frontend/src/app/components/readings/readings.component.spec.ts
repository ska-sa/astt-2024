import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ReadingsComponent } from './readings.component';
import { ReadingService } from '../../services/reading.service';
import { TelescopeService } from '../../services/telescope.service';
import { Reading } from '../../interfaces/reading';

describe('ReadingsComponent', () => {
  let component: ReadingsComponent;
  let fixture: ComponentFixture<ReadingsComponent>;
  let readingService: jasmine.SpyObj<ReadingService>;
  let telescopeService: jasmine.SpyObj<TelescopeService>;

  function sensorReading(overrides: Partial<Reading> = {}): Reading {
    return {
      id: 101, telescope_id: 7, created_at: '2026-10-22T10:00:00Z',
      azimuth_angle: 180, elevation_angle: 45,
      latitude: 0, longitude: 0, altitude: 0,
      gyroscope_x: 0, gyroscope_y: 0, gyroscope_z: 0,
      acceleration_x: 0, acceleration_y: 0, acceleration_z: 0,
      magnetic_field_x: 0, magnetic_field_y: 0, magnetic_field_z: 0,
      health_status: 'OK', movement_status: 'IDLE', ...overrides
    };
  }

  beforeEach(async () => {
    readingService = jasmine.createSpyObj<ReadingService>('ReadingService', ['getReadings']);
    telescopeService = jasmine.createSpyObj<TelescopeService>('TelescopeService', ['getTelescopes']);
    readingService.getReadings.and.returnValue(of([]));
    telescopeService.getTelescopes.and.returnValue(of([]));
    await TestBed.configureTestingModule({
      imports: [ReadingsComponent],
      providers: [
        { provide: ReadingService, useValue: readingService },
        { provide: TelescopeService, useValue: telescopeService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReadingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows collapsed escaped diagnostics for each row without mixing their logs', () => {
    component.readings = [
      sensorReading({ serial_log: '<script>first reading</script>' }),
      sensorReading({ id: 102, serial_log: 'second reading' })
    ];
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const details: NodeListOf<HTMLDetailsElement> = element.querySelectorAll<HTMLDetailsElement>('tbody details');

    expect(details.length).toBe(2);
    expect(details[0].open).toBeFalse();
    expect(details[0].querySelector('summary')?.textContent).toBe('Show more');
    expect(details[0].querySelector('pre')?.textContent).toBe('<script>first reading</script>');
    expect(details[0].querySelector('script')).toBeNull();
    expect(details[1].querySelector('pre')?.textContent).toBe('second reading');
    expect(details[1].textContent).not.toContain('first reading');
  });

  it('uses the legacy fallback for missing, null, or empty diagnostics', () => {
    component.readings = [sensorReading(), sensorReading({ serial_log: null }), sensorReading({ serial_log: '' })];
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    element.querySelectorAll('tbody pre').forEach((log: Element) => {
      expect(log.textContent).toBe('No diagnostics recorded for this reading.');
    });
    expect(element.querySelectorAll('tbody pre').length).toBe(3);
  });

  it('styles actual health and displays the reported movement instead of treating any string as moving', () => {
    component.readings = [
      sensorReading({ health_status: 'DEGRADED', movement_status: 'IDLE' }),
      sensorReading({ health_status: 'FAULT', movement_status: 'ESTOP' }),
      sensorReading({ health_status: 'OFFLINE' })
    ];
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const rows: NodeListOf<HTMLTableRowElement> = element.querySelectorAll<HTMLTableRowElement>('tbody tr');

    expect(rows[0].querySelector('.text-warning')?.textContent).toBe('DEGRADED');
    expect(rows[0].cells[3].textContent).toBe('IDLE');
    expect(rows[1].querySelector('.text-danger')?.textContent).toBe('FAULT');
    expect(rows[1].cells[3].textContent).toBe('ESTOP');
    expect(rows[2].querySelector('.text-secondary')?.textContent).toBe('OFFLINE');
  });
});
