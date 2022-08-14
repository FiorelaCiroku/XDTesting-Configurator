import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { Observable, of, Subject } from 'rxjs';
import { SELECTED_BRANCH_KEY, SELECTED_REPO_KEY } from 'src/app/constants';
import { Repository, ShortBranch } from 'src/app/models';
import { ApiService } from 'src/app/services';
import { WindowWrapper } from 'src/app/wrappers';
import { SelectRepoComponent } from './select-repo.component';


async function initialize(apiServiceMock?: Partial<ApiService> | null, dynamicDialogRefMock?: Partial<DynamicDialogRef> | null, dynamicDialogConfigMock?: Partial<DynamicDialogConfig> | null): Promise<{ component: SelectRepoComponent, fixture: ComponentFixture<SelectRepoComponent> }> {
  apiServiceMock = {
    listRepos: (): Observable<Repository[]> => of([]),
    ...(apiServiceMock ?? {})
  };

  await TestBed.configureTestingModule({
    declarations: [ SelectRepoComponent ],
    providers: [
      { provide: ApiService, useValue: apiServiceMock},
      { provide: DynamicDialogRef, useValue: dynamicDialogRefMock },
      { provide: DynamicDialogConfig, useValue: dynamicDialogConfigMock }
    ],
    schemas: [NO_ERRORS_SCHEMA]
  })
  .compileComponents();

  const fixture = TestBed.createComponent(SelectRepoComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  return { fixture, component };
}


describe('SelectRepoComponent', () => {
  it('should create', async () => {
    const {component} = await initialize();
    expect(component).toBeTruthy();
  });

  it('should not fetch branches', async () => {
    const listRepos$ = new Subject<Repository[]>();
    const apiServiceMock: Partial<ApiService> = {
      listRepos: jasmine.createSpy('listRepos').and.returnValue(listRepos$.asObservable()),
      listBranches: jasmine.createSpy('listBranches')
    };
    const {fixture, component} = await initialize(apiServiceMock);

    expect(component.loading).toBeTrue();

    listRepos$.next([]);
    listRepos$.complete();
    await fixture.whenStable();

    expect(component.loading).toBeFalse();
    expect(apiServiceMock.listBranches).not.toHaveBeenCalled();
    expect(component.repos).toEqual([]);
  });


  it('should fetch branches', async () => {
    const listRepos$ = new Subject<Repository[]>();
    const apiServiceMock: Partial<ApiService> = {
      listRepos: jasmine.createSpy('listRepos').and.returnValue(listRepos$.asObservable()),
      listBranches: jasmine.createSpy('listBranches').and.returnValue(of([]))
    };

    spyOn(localStorage, 'getItem').and.callFake((key: string): string | null => key === SELECTED_REPO_KEY ? 'repo' : null);

    const {fixture, component} = await initialize(apiServiceMock);
    expect(component.loading).toBeTrue();

    listRepos$.next([]);
    listRepos$.complete();
    await fixture.whenStable();

    expect(component.loading).toBeFalse();
    expect(apiServiceMock.listBranches).toHaveBeenCalled();
    expect(component.repos).toEqual([]);
  });

  it('should reset and reload branches - empty repository selection', async() => {
    spyOn(localStorage, 'getItem').and.callFake((key: string): string | null => key === SELECTED_BRANCH_KEY ? 'branch' : '');
    const {component} = await initialize();

    expect(component.selectedBranch).toEqual('branch');

    component.onRepositorySelection();

    expect(component.selectedBranch).not.toBeDefined();
    expect(component.branches).toEqual([]);
  });

  it('should reset and reload branches - repository selection', async () => {
    const listRepos$ = new Subject<Partial<Repository>[]>();
    const listBranches$ = new Subject<Partial<ShortBranch>[]>();
    const apiServiceMock: Partial<ApiService> = {
      listRepos: jasmine.createSpy('listRepos').and.returnValue(listRepos$.asObservable()),
      listBranches: jasmine.createSpy('listBranches').and.returnValue(listBranches$.asObservable())
    };

    const {fixture, component} = await initialize(apiServiceMock);

    listRepos$.next([{ full_name: 'user/repo' }]);
    listRepos$.complete();

    await fixture.whenStable();

    component.selectedRepo = 'user/repo';
    component.onRepositorySelection();

    expect(component.loading).toBeTrue();

    const branch: Partial<ShortBranch> = { name: 'main' };
    listBranches$.next([branch]);
    listBranches$.complete();

    await fixture.whenStable();

    expect(component.branches).toEqual(jasmine.objectContaining([branch]));
    expect(component.loading).toBeFalse();
  });

  it('should not save selection', async() => {
    const setItemSpy = spyOn(localStorage, 'setItem');

    async function test(selectedRepo?: string | null, selectedBranch?: string | null): Promise<void> {
      const {component} = await initialize();
      component.selectedRepo = selectedRepo;
      component.selectedBranch = selectedBranch;
      component.saveRepository();

      expect(component.error).toEqual('No repository or branch selected');
      expect(setItemSpy).not.toHaveBeenCalled();

      setItemSpy.calls.reset();
    }

    const args: Parameters<typeof test>[] = [
      [undefined, undefined],
      [null, undefined],
      ['repo', undefined],
      [undefined, null],
      [null, null],
      ['repo', null],
      [undefined, 'branch'],
      [null, 'branch'],
    ];

    await Promise.all(args.map(([repo, branch]) => test(repo, branch)));
  });


  it('should save selection', async() => {
    const getItemSpy = spyOn(localStorage, 'getItem');
    const setItemSpy = spyOn(localStorage, 'setItem');
    const reloadSpy = spyOn(WindowWrapper, 'reload');
    const dynamicDialogRefMock = { close: jasmine.createSpy('close') };

    async function test(prevRepo: string | null, prevBranch: string | null): Promise<void> {
      const {component} = await initialize(null, dynamicDialogRefMock);

      getItemSpy.and.callFake((key: string): string | null => {
        if (key === SELECTED_REPO_KEY) {
          return prevRepo;
        } else if (key === SELECTED_BRANCH_KEY) {
          return prevBranch;
        }
        return null;
      });

      component.selectedRepo = 'repo';
      component.selectedBranch = 'branch';
      component.saveRepository();

      expect(component.error).not.toBeDefined();
      expect(setItemSpy).toHaveBeenCalledWith(SELECTED_REPO_KEY, 'repo');
      expect(setItemSpy).toHaveBeenCalledWith(SELECTED_BRANCH_KEY, 'branch');
      expect(dynamicDialogRefMock.close).toHaveBeenCalled();

      if (prevRepo !== 'repo' || prevBranch !== 'branch') {
        expect(reloadSpy).toHaveBeenCalled();
      } else {
        expect(reloadSpy).not.toHaveBeenCalled();
      }

      reloadSpy.calls.reset();
      getItemSpy.calls.reset();
    }

    const args: Parameters<typeof test>[] = [
      [null, null],
      ['otherRepo', null],
      ['repo', null],
      [null, 'otherBranch'],
      ['otherRepo', 'otherBranch'],
      ['repo', 'otherBranch'],
      [null, 'branch'],
      ['otherRepo', 'branch'],
      ['repo', 'branch']
    ];

    await Promise.all(args.map(([repo, branch]) => test(repo, branch)));
  });
});
