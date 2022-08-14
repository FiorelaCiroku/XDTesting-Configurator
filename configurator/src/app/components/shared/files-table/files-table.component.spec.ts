import { Component, ElementRef, NO_ERRORS_SCHEMA, SimpleChange, Type, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Table } from 'primeng/table';
import { FragmentFile } from 'src/app/models';
import { FilesTableComponent } from './files-table.component';

@Component({
  template: '<config-files-table [files]="files" [loading]="loading" [emptyMessage]="emptyMessage" #filesTable></config-files-table>'
})
class Wrapper {
  files: FragmentFile[] = [];
  loading = false;
  emptyMessage?: string;

  @ViewChild('filesTable', { read: FilesTableComponent })
  filesTable!: FilesTableComponent;
}


async function initialize<T = FilesTableComponent>(type?: Type<T>): Promise<{ component: T; fixture: ComponentFixture<T> }> {
  await TestBed.configureTestingModule({
    declarations: [FilesTableComponent, Wrapper],
    schemas: [NO_ERRORS_SCHEMA]
  })
    .compileComponents();

  let fixture: ComponentFixture<any>;
  if (type) {
    fixture = TestBed.createComponent(type);
  } else {
    fixture = TestBed.createComponent(FilesTableComponent);
  }

  const component = fixture.componentInstance;
  fixture.detectChanges();

  return { component, fixture };
}

describe('FilesTableComponent', () => {
  it('should trigger file processing once', async () => {
    const { fixture, component } = await initialize(Wrapper);
    await fixture.whenStable();

    const prevFiles = component.filesTable.files;

    component.loading = true;
    fixture.detectChanges();

    expect(component.filesTable.files).toBe(prevFiles);
  });

  it('should trigger file processing twice', async () => {
    const { fixture, component } = await initialize(Wrapper);
    await fixture.whenStable();

    const prevFiles = component.filesTable.files;

    component.files = [{ name: '', path: '', type: 'query' }];
    fixture.detectChanges();

    expect(component.filesTable.files).not.toBe(prevFiles);
  });

  it('should add extensions', async () => {
    const files: FragmentFile[] = [{
      name: 'name.txt',
      path: 'some/path',
      type: 'query'
    }, {
      name: 'file2.txt',
      path: 'some/path',
      type: 'dataset',
      extension: 'png'
    }];

    const { component } = await initialize();
    const prevFiles = component.files;
    const change = new SimpleChange(prevFiles, files, false);
    component.files = files;
    component.ngOnChanges({ files: change });

    expect(component.files).not.toBe(prevFiles);
    expect(component.files).not.toBe(files);
    expect(component.files[0]).toEqual({ ...files[0], extension: 'txt' });
    expect(component.files[1]).toEqual(files[1]);
  });

  it('should generate download url', async () => {
    const { component } = await initialize();
    const file: FragmentFile = {
      name: 'file.txt',
      path: 'some/path/to/file.txt',
      type: 'dataset',
      extension: 'png'
    };


    const test = (repo: string | null = null, branch: string | null = null): string => {
      Object.defineProperty(component, '_repository', { value: repo });
      Object.defineProperty(component, '_branch', { value: branch });
      return component.downloadUrl(file);
    };

    const args: [...Parameters<typeof test>, string][] = [
      [null, null, ''],
      ['', null, ''],
      ['user/repo', null, ''],
      ['user/repo', '', ''],
      ['user/repo', 'branch', 'https://raw.githubusercontent.com/user/repo/branch/some/path/to/file.txt']
    ];

    args.forEach(([repo, branch, expectedResult]) => {
      const result = test(repo, branch);
      expect(result).toEqual(expectedResult);
    });
  });

  it('should clear table\'s filters', async () => {
    const { component, fixture } = await initialize();
    component.table = jasmine.createSpyObj<Table>('table', ['clear']);
    component.tableFilter = jasmine.createSpyObj<ElementRef>('tableFilter', [], {
      nativeElement: document.createElement('input')
    });

    component.tableFilter!.nativeElement.value = 'Some value';
    component.tableFilter!.nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.tableFilter!.nativeElement.value).toEqual('Some value');

    component.clear();

    expect(component.tableFilter!.nativeElement.value).toEqual('');
    expect(component.table!.clear).toHaveBeenCalled();
  });

  it('should not throw error on missing table', async () => {
    const { component } = await initialize();
    expect(component.clear.bind(component)).not.toThrow();
  });

  it('should not throw error on missing table filter input', async () => {
    const { component } = await initialize();
    component.table = jasmine.createSpyObj<Table>('table', ['clear']);
    expect(component.clear.bind(component)).not.toThrow();
  });

  it('should filter table globally', async () => {
    const { component } = await initialize();
    const event = new Event('change');
    const input = document.createElement('input');

    Object.defineProperty(event, 'target', { value: input });
    component.table = jasmine.createSpyObj<Table>('table', ['filterGlobal']);


    const test = (val: string): void => {
      input.value = val;
      component.filterContent(event);

      expect(component.table!.filterGlobal).toHaveBeenCalledWith(val, 'contains');
    };

    ['', 'some value'].forEach(test);
  });

  it('should not filter on empty event target', async () => {
    const { component } = await initialize();
    const event = new Event('change');
    const targetSpy = spyOnProperty(event, 'target', 'get').and.callThrough();

    component.table = jasmine.createSpyObj<Table>('table', ['filterGlobal']);
    expect(component.filterContent.bind(component, event)).not.toThrow();
    expect(targetSpy).toHaveBeenCalled();
    expect(component.table!.filterGlobal).not.toHaveBeenCalled();
  });

  it('should not throw on empty table while trying to filter globally', async () => {
    const { component } = await initialize();
    const event = new Event('change');
    const input = document.createElement('input');

    Object.defineProperty(event, 'target', { value: input });

    expect(component.filterContent.bind(component, event)).not.toThrow();
  });
});
