import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TelescopeDetailsComponent } from './telescope-details.component';

describe('TelescopeDetailsComponent', () => {
  let component: TelescopeDetailsComponent;
  let fixture: ComponentFixture<TelescopeDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TelescopeDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TelescopeDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
