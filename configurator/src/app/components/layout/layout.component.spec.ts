import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { BehaviorSubject, Subject } from 'rxjs';
import { SELECTED_BRANCH_KEY, SELECTED_REPO_KEY } from 'src/app/constants';
import { ApiService } from 'src/app/services';
import { WindowWrapper } from 'src/app/wrappers';
import { SelectRepoComponent } from '../modals';
import { LayoutComponent } from './layout.component';



let $close: Subject<void>;

function createComponent(): { component: LayoutComponent, fixture: ComponentFixture<LayoutComponent> } {
  const fixture = TestBed.createComponent(LayoutComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  return { component, fixture };
}


describe('LayoutComponent', () => {
  beforeEach(async () => {
    $close = new Subject<void>();

    const apiServiceMock: Partial<ApiService> = {
      $loading: new BehaviorSubject<boolean>(false),
    };

    const dynamicDialogRefMock: Partial<DynamicDialogRef> = jasmine.createSpyObj('dynamicDialogRef', [], {
      onClose: $close.asObservable()
    });

    const dialogServiceMock: Partial<DialogService> = {
      open: jasmine.createSpy('open').and.returnValue(dynamicDialogRefMock)
    };

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      declarations: [ LayoutComponent ],
      providers: [
        { provide: ApiService, useValue: apiServiceMock }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .overrideComponent(LayoutComponent, {
      set: { providers: [{ provide: DialogService, useValue: dialogServiceMock }] }
    })
    .compileComponents();
  });



  it('should open modal at creation - no branch', async () => {
    const openModalSpy = spyOn(LayoutComponent.prototype, 'openModal').and.callThrough();
    const reloadSpy = spyOn(WindowWrapper, 'reload');
    const {fixture, component} = createComponent();
    const dialogServiceMock = fixture.debugElement.injector.get(DialogService);

    expect(component).toBeTruthy();
    expect(openModalSpy).toHaveBeenCalled();
    expect(dialogServiceMock.open).toHaveBeenCalled();

    spyOn(localStorage, 'getItem').and.callFake(
      (key: string): string | null => key === SELECTED_REPO_KEY ? 'repo' : null
    );

    $close.next();
    $close.complete();

    await fixture.whenStable();

    expect(reloadSpy).toHaveBeenCalled();
  });


  it('should open modal at creation - no repo', async () => {
    const openModalSpy = spyOn(LayoutComponent.prototype, 'openModal').and.callThrough();
    const reloadSpy = spyOn(WindowWrapper, 'reload');
    const {fixture, component} = createComponent();
    const dialogServiceMock = fixture.debugElement.injector.get(DialogService);

    expect(component).toBeTruthy();
    expect(openModalSpy).toHaveBeenCalled();
    expect(dialogServiceMock.open).toHaveBeenCalled();

    spyOn(localStorage, 'getItem').and.callFake(
      (key: string): string | null => key === SELECTED_BRANCH_KEY ? 'branch' : null
    );

    $close.next();
    $close.complete();

    await fixture.whenStable();

    expect(reloadSpy).toHaveBeenCalled();
  });


  it('should not open modal at creation', async () => {
    const openModalSpy = spyOn(LayoutComponent.prototype, 'openModal').and.callThrough();
    const reloadSpy = spyOn(WindowWrapper, 'reload');
    spyOn(localStorage, 'getItem').and.returnValue('selected');

    const {component} = createComponent();
    expect(component).toBeTruthy();
    expect(openModalSpy).not.toHaveBeenCalled();
    expect(reloadSpy).not.toHaveBeenCalled();
  });


  it('should not reload page', async () => {
    const openModalSpy = spyOn(LayoutComponent.prototype, 'openModal').and.callThrough();
    const reloadSpy = spyOn(WindowWrapper, 'reload');
    const {fixture, component} = createComponent();
    const dialogServiceMock = fixture.debugElement.injector.get(DialogService);

    expect(component).toBeTruthy();
    expect(openModalSpy).toHaveBeenCalled();
    expect(dialogServiceMock.open).toHaveBeenCalled();

    $close.next();
    $close.complete();

    await fixture.whenStable();

    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('should make modal closable', () => {
    spyOn(localStorage, 'getItem').and.returnValue('selected');

    const {fixture, component} = createComponent();
    const dialogServiceMock = fixture.debugElement.injector.get(DialogService);

    expect(component).toBeTruthy();

    component.openModal();

    expect(dialogServiceMock.open).toHaveBeenCalled();
    expect(dialogServiceMock.open).toHaveBeenCalledWith(SelectRepoComponent, jasmine.objectContaining<DynamicDialogConfig>({closable: true}));
  });
});
