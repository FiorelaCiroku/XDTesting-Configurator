import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { ApiService } from './api.service';
import { EMPTY, lastValueFrom, Observable, of, throwError } from 'rxjs';
import { baseUrl } from 'src/environments/environment';
import { ContentFile, CreateOrUpdateFile, CreateOrUpdateFileResponse, Fragment, OntologyForm, Repository, ShortBranch, TestDetail, UserInput } from '../models';
import { SELECTED_BRANCH_KEY, SELECTED_REPO_KEY } from '../constants';
import { encode } from 'js-base64';


const defaultResponseContent: Observable<CreateOrUpdateFileResponse> = of({ commit: {}, content: {} });
type HeadersDict = { [k: string]: string };

function buildHttpResponse<T>(body: T, headers?: HeadersDict, status = 200): HttpResponse<T> {
  return new HttpResponse({
    status,
    body,
    headers: new HttpHeaders(headers)
  });
}

function buildErrorResponse(status = 400, error = 'Error', headers?: HeadersDict): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    error,
    headers: new HttpHeaders(headers)
  });
}

function getItemMock(key: string): string | null {
  if (key === SELECTED_REPO_KEY) {
    return 'user/repo';
  } else if (key === SELECTED_BRANCH_KEY) {
    return 'branch';
  }

  return null;
}


describe('ApiService', () => {
  let localStorageGetItemSpy: jasmine.Spy;
  let httpClientMock: jasmine.SpyObj<HttpClient>;
  let service: ApiService;

  beforeAll(() => {
    localStorageGetItemSpy = spyOn(localStorage, 'getItem');
  });

  beforeEach(() => {
    localStorageGetItemSpy.calls.reset();
    localStorageGetItemSpy.and.callFake(getItemMock);

    httpClientMock = jasmine.createSpyObj<HttpClient>('httpClient', ['get', 'put']);
    service = new ApiService(httpClientMock);
  });


  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should list repositories', async () => {
    async function test(response?: Partial<Repository>[], headers?: HeadersDict, statusCode = 200): Promise<void> {
      const error = statusCode >= 300;
      const eTag = service['repositoriesEtag'];

      httpClientMock.get.calls.reset();
      httpClientMock.get.and.returnValue(error ? throwError(() => buildErrorResponse(statusCode)) : of(buildHttpResponse(response, headers)));
      await lastValueFrom(service.listRepos());

      if (eTag) {
        expect(httpClientMock.get).toHaveBeenCalledWith(
          `${baseUrl}/user/repos?type=all&per_page=100`,
          jasmine.objectContaining({ observe: 'response', headers: eTag ? { 'If-None-Match': eTag } : {} })
        );
      }

      expect(service['repositoriesEtag']).toEqual(error ? eTag : headers?.['etag'].replace('W/', '') || '');

      if (!error) {
        expect(service['repositories']).toEqual(<Repository[]>response || []);
      }
    }

    // execute in sequence to avoid concurrency issues
    await test([{ full_name: 'user/repo' }], { etag: 'W/1a2b3c' });
    await test([{ full_name: 'user/repo' }]);
    await test(undefined, { etag: 'W/4d5e6f' });
    await test(undefined, undefined, 304);

    service['repositories'] = undefined;
    await test(undefined, undefined, 304);
  });

  it('should list branches', async () => {
    async function test(repository: string, response?: Partial<ShortBranch>[], headers?: HeadersDict, statusCode = 200): Promise<void> {
      const error = statusCode >= 300;
      const eTag = service['branchesEtag'];

      httpClientMock.get.calls.reset();
      httpClientMock.get.and.returnValue(error ? throwError(() => buildErrorResponse(statusCode)) : of(buildHttpResponse(response, headers)));
      await lastValueFrom(service.listBranches(repository));

      if (eTag) {
        expect(httpClientMock.get).toHaveBeenCalledWith(
          `${baseUrl}/repos/${repository}/branches`,
          jasmine.objectContaining({ observe: 'response', headers: eTag ? { 'If-None-Match': eTag } : {} })
        );
      }

      expect(service['branchesEtag']).toEqual(error ? eTag : headers?.['etag'].replace('W/', '') || '');

      if (!error) {
        expect(service['branches']).toEqual(<ShortBranch[]>response || []);
      }
    }

    // execute in sequence to avoid concurrency issues
    await test('repo', [{ name: 'main' }], { etag: 'W/1a2b3c' });
    await test('repo', [{ name: 'main' }]);
    await test('repo', undefined, { etag: 'W/4d5e6f' });
    await test('repo', undefined, undefined, 304);

    service['branches'] = undefined;
    await test('repo', undefined, undefined, 304);
  });

  it('should build url', () => {
    const getUrl = ApiService['getUrl'];
    let url: string | null;

    url = getUrl('/some/base/url');
    expect(url).toEqual(`${baseUrl}/some/base/url?branch=branch`);

    url = getUrl('/{repo}');
    expect(url).toEqual(`${baseUrl}/user/repo?branch=branch`);

    url = getUrl('/{user}/{repo}');
    expect(url).toEqual(`${baseUrl}/user/repo?branch=branch`);

    url = getUrl('/{repo}', 'someOtherRepo');
    expect(url).toEqual(`${baseUrl}/someOtherRepo?branch=branch`);

    url = getUrl('/{repo}', 'someOtherRepo', 'someOtherBranch');
    expect(url).toEqual(`${baseUrl}/someOtherRepo?branch=someOtherBranch`);

    localStorageGetItemSpy.and.callFake((key: string): string | null => {
      if (key === SELECTED_REPO_KEY) {
        return 'repo';
      }

      return null;
    });

    url = getUrl('/{repo}');
    expect(url).toEqual(null);


    localStorageGetItemSpy.and.callFake((key: string): string | null => {
      if (key === SELECTED_BRANCH_KEY) {
        return 'branch';
      }

      return null;
    });

    url = getUrl('/{repo}');
    expect(url).toEqual(null);
  });

  it('should not list files', async () => {
    const errorResponse = buildErrorResponse();
    httpClientMock.get.and.returnValue(throwError(() => errorResponse));
    await expectAsync(lastValueFrom(service.listFiles())).toBeRejectedWith(errorResponse);

    localStorageGetItemSpy.and.returnValue(null);
    await expectAsync(lastValueFrom(service.listFiles())).toBeRejectedWith('Error building URL. Repository or branch undefined');
  });

  it('should list files', async () => {
    const response = [{ name: 'some file' }] as ContentFile[];

    httpClientMock.get.and.returnValue(of(response));
    await expectAsync(lastValueFrom(service.listFiles())).toBeResolvedTo(response);

    httpClientMock.get.and.returnValue(throwError(() => buildErrorResponse(404)));
    await expectAsync(lastValueFrom(service.listFiles())).toBeResolvedTo([]);
  });

  it('should not list test files', async () => {
    await expectAsync(lastValueFrom(service.listTestFiles())).toBeRejectedWith('Empty fragment');
  });

  it('should list test files', async () => {
    const listSpy = spyOn(service, 'listFiles').and.returnValue(of([]));
    let files = await lastValueFrom(service.listTestFiles({ name: 'fragment', ontologyName: 'ontology' }));

    expect(files).toEqual([]);
    expect(listSpy.calls.allArgs()).toEqual([
      ['.xd-testing/ontology/fragment/queries'],
      ['.xd-testing/ontology/fragment/expectedResults'],
      ['.xd-testing/ontology/fragment/datasets']
    ]);

    listSpy.calls.reset();
    files = await lastValueFrom(service.listTestFiles({ name: 'fragment', ontologyName: 'ontology' }, 'query'));
    expect(listSpy).toHaveBeenCalledOnceWith('.xd-testing/ontology/fragment/queries');
    expect(files).toEqual([]);
  });

  it('should not list fragments', () => {
    localStorageGetItemSpy.and.returnValue(null);
    expect(service.getFragments()).toBe(EMPTY);
  });

  it('should list fragments', async () => {
    async function test(response?: UserInput, headers?: HeadersDict, statusCode = 200, emptyResponse = false): Promise<void> {
      const error = statusCode >= 300;
      const eTag = service['userInputEtag'];
      const fullResponse: Partial<ContentFile> | undefined = emptyResponse ? undefined : {
        content: encode(JSON.stringify(response))
      };

      httpClientMock.get.calls.reset();
      httpClientMock.get.and.returnValue(error ? throwError(() => buildErrorResponse(statusCode)) : of(buildHttpResponse(fullResponse, headers)));
      const fragments = await lastValueFrom(service.getFragments());

      expect(fragments).toEqual(response?.fragments || service['userInput']?.fragments || []);

      if (eTag) {
        expect(httpClientMock.get).toHaveBeenCalledWith(
          `${baseUrl}/repos/user/repo/contents/.xd-testing/UserInput.json?branch=branch`,
          jasmine.objectContaining({ observe: 'response', headers: eTag ? { 'If-None-Match': eTag } : {} })
        );
      }

      expect(service['userInputEtag']).toEqual(error ? eTag : headers?.['etag'].replace('W/', '') || '');

      if (!error) {
        expect(service['userInput']).toEqual(response || { fragments: [], ontologies: [] });
      }
    }

    // execute in sequence to avoid concurrency issues
    await test();
    await test(undefined, undefined, 200, true);
    await test({}, { etag: 'W/1a2b3c' });
    await test({ fragments: [{ name: 'fragment', ontologyName: 'ontology' }] }, { etag: 'W/4d5e6f' });

    await test({}, undefined, 304);

    service['userInput'] = undefined;
    await test({}, undefined, 304);

    service['userInput'] = {};
    await test({}, undefined, 304);

    service['userInput'] = { fragments: [{ name: 'fragment', ontologyName: 'ontology' }]};
    await test({}, undefined, 304);
  });

  it('should return fragment', async () => {
    const result: Fragment = { name: 'fragment', ontologyName: 'ontology' };

    spyOn(service, 'getFragments').and.returnValue(of([
      { name: '', ontologyName: '' },
      { name: 'fragment', ontologyName: 'otherOntology' },
      { name: 'otherFragment', ontologyName: 'ontology' },
      result
    ]));

    await expectAsync(lastValueFrom(service.getFragment('fragment', 'ontology'))).toBeResolvedTo(result);
  });

  it('should throw on fragment not found', async () => {
    spyOn(service, 'getFragments').and.returnValue(of([
      { name: '', ontologyName: '' },
      { name: 'fragment', ontologyName: 'otherOntology' },
      { name: 'otherFragment', ontologyName: 'ontology' },
    ]));

    await expectAsync(lastValueFrom(service.getFragment('fragment', 'ontology'))).toBeRejectedWith('No fragments found with name fragment belonging to ontology ontology');
  });

  it('should return error on duplicate fragment', async () => {
    const toCreate: Fragment = { name: 'fragment', ontologyName: 'ontology' };
    spyOn(service, 'getFragments').and.returnValue(of([
      { name: 'fragment', ontologyName: 'otherOntology' },
      { name: 'otherFragment', ontologyName: 'ontology' },
      toCreate
    ]));

    await expectAsync(lastValueFrom(service.createFragment(toCreate))).toBeResolvedTo({ success: false, message: 'Fragment already exists' });
  });

  it('should return error on http error', async () => {
    const toCreate: Fragment = { name: 'fragment', ontologyName: 'ontology' };

    httpClientMock.put.and.returnValue(throwError(() => new HttpErrorResponse({ error: 'Http error', status: 400 })));
    spyOn(service, 'getFragments').and.returnValue(of([
      { name: 'fragment', ontologyName: 'otherOntology' },
      { name: 'otherFragment', ontologyName: 'ontology' },
    ]));

    await expectAsync(lastValueFrom(service.createFragment(toCreate))).toBeResolvedTo({ success: false, message: 'Http error' });
  });

  it('should create fragment', async () => {
    const toCreate: Fragment = { name: 'fragment', ontologyName: 'ontology' };

    httpClientMock.put.and.returnValue(defaultResponseContent);
    spyOn(service, 'getFragments').and.returnValue(of([
      { name: 'fragment', ontologyName: 'otherOntology' },
      { name: 'otherFragment', ontologyName: 'ontology' },
    ]));

    await expectAsync(lastValueFrom(service.createFragment(toCreate))).toBeResolvedTo({ success: true });
  });

  it('should return error on invalid fragment to update', async () => {
    const toUpdate: Fragment = { name: 'fragment', ontologyName: 'ontology' };
    const testMock = jasmine.createSpyObj<Omit<TestDetail, 'id'>>('testDetail', [], ['content']);

    spyOn(service, 'getFragments').and.returnValue(of([
      { name: 'fragment', ontologyName: 'otherOntology' },
      { name: 'otherFragment', ontologyName: 'ontology' },
    ]));

    await expectAsync(lastValueFrom(service.updateFragmentTest(toUpdate, testMock))).toBeResolvedTo({ success: false, message: 'Fragment not found' });
  });

  it('should return error on invalid test to update', async () => {
    const toUpdate: Fragment = { name: 'fragment', ontologyName: 'ontology' };
    const testMock: Omit<TestDetail, 'id'> = {
      content: '',
      status: 'success',
      type: 'COMPETENCY_QUESTION',
    };

    spyOn(service, 'getFragments').and.returnValue(of([
      { name: 'fragment', ontologyName: 'otherOntology' },
      { name: 'otherFragment', ontologyName: 'ontology' },
      toUpdate
    ]));

    await expectAsync(lastValueFrom(service.updateFragmentTest(toUpdate, testMock, '1'))).toBeResolvedTo({ success: false, message: 'Test id not found' });
  });

  it('should return error on http error (updateFragmentTest)', async () => {
    const testMock: Omit<TestDetail, 'id'> = { content: '', status: 'success', type: 'COMPETENCY_QUESTION' };
    const toUpdate: Fragment = {
      name: 'fragment',
      ontologyName: 'ontology',
    };

    httpClientMock.put.and.returnValue(throwError(() => buildErrorResponse(400, 'Http Error')));
    spyOn(service, 'getFragments').and.returnValue(of([
      { name: 'fragment', ontologyName: 'otherOntology' },
      { name: 'otherFragment', ontologyName: 'ontology' },
      toUpdate
    ]));

    await expectAsync(lastValueFrom(service.updateFragmentTest(toUpdate, testMock))).toBeResolvedTo({ success: false, message: 'Http Error' });
  });

  it('should create new test on specified fragment', async () => {
    const testMock: Omit<TestDetail, 'id'> = { content: '', status: 'success', type: 'COMPETENCY_QUESTION' };
    const toUpdate: Fragment = {
      name: 'fragment',
      ontologyName: 'ontology',
      tests: [
        { content: '', status: 'success', type: 'ERROR_PROVOCATION', id: 'EP001' },
        { content: '', status: 'success', type: 'COMPETENCY_QUESTION', id: 'CQ001' },
        { content: '', status: 'success', type: 'COMPETENCY_QUESTION', id: 'CQ001' }, // ERROR: duplicate id
        { content: '', status: 'success', type: 'INFERENCE_VERIFICATION', id: 'CQ001' } // ERROR: id prefix doesn't match test type
      ]
    };

    const currentTestLength = toUpdate.tests!.length;

    spyOn(service, 'getFragments').and.returnValue(of([
      { name: 'fragment', ontologyName: 'otherOntology' },
      { name: 'otherFragment', ontologyName: 'ontology' },
      toUpdate
    ]));

    httpClientMock.put.and.returnValue(defaultResponseContent);
    await expectAsync(lastValueFrom(service.updateFragmentTest(toUpdate, testMock))).toBeResolvedTo({
      success: true,
      data: jasmine.objectContaining<TestDetail>({
        id: 'CQ002'
      })
    });

    expect(toUpdate.tests!.length - currentTestLength).toEqual(1);
  });

  it('should update specified test on specified fragment', async () => {
    const testMock: Omit<TestDetail, 'id'> = { content: 'New Content', status: 'running', type: 'COMPETENCY_QUESTION' };
    const toUpdate: Fragment = {
      name: 'fragment',
      ontologyName: 'ontology',
      tests: [
        { content: '', status: 'success', type: 'ERROR_PROVOCATION', id: 'EP001' },
        { content: '', status: 'success', type: 'COMPETENCY_QUESTION', id: 'CQ001' },
      ]
    };

    spyOn(service, 'getFragments').and.returnValue(of([
      { name: 'fragment', ontologyName: 'otherOntology' },
      { name: 'otherFragment', ontologyName: 'ontology' },
      toUpdate
    ]));

    httpClientMock.put.and.returnValue(defaultResponseContent);
    await expectAsync(lastValueFrom(service.updateFragmentTest(toUpdate, testMock, 'CQ001'))).toBeResolvedTo({
      success: true,
      data: jasmine.objectContaining<TestDetail>({
        id: 'CQ001',
        content: 'New Content'
      })
    });
  });

  it('should return success on empty file (uploadFragmentFile)', async () => {
    await expectAsync(lastValueFrom(service.uploadFragmentFile())).toBeResolvedTo({ success: true });
  });

  it('should throw error on empty fragment (uploadFragmentFile)', async () => {
    await expectAsync(lastValueFrom(service.uploadFragmentFile(new File([], '')))).toBeRejectedWith('Fragment not provided');
  });

  it('should return error on undefined url (uploadFragmentFile)', async () => {
    spyOn(service, 'listFiles').and.returnValue(of([{ name: 'oldFile' }] as ContentFile[]));
    httpClientMock.put.and.returnValue(defaultResponseContent);
    localStorageGetItemSpy.and.returnValue(null);
    await expectAsync(lastValueFrom(service.uploadFragmentFile(new File([], 'newFile'), { name: 'fragment', ontologyName: 'ontology' })))
      .toBeResolvedTo({ success: false, message: 'Could not get url. Missing repository or branch' });
  });

  it('should return error on httpError (uploadFragmentFile)', async () => {
    spyOn(service, 'listFiles').and.returnValue(of([{ name: 'oldFile' }] as ContentFile[]));
    httpClientMock.put.and.returnValue(throwError(() => buildErrorResponse(400, 'Http error')));
    await expectAsync(lastValueFrom(service.uploadFragmentFile(new File([], 'newFile'), { name: 'fragment', ontologyName: 'ontology' })))
      .toBeResolvedTo({ success: false, message: 'Http error' });
  });

  it('should rename file on duplicated name (uploadFragmentFile)', async () => {
    const listFilesSpy = spyOn(service, 'listFiles');
    httpClientMock.put.and.returnValue(defaultResponseContent);

    const test = async (fileName: string): Promise<void> => {
      listFilesSpy.and.returnValue(of([{ name: fileName }] as ContentFile[]));
      const result = await lastValueFrom(service.uploadFragmentFile(new File([], fileName), { name: 'fragment', ontologyName: 'ontology' }));

      const newNameChunks = result.data?.split('_') || [];
      const oldNameChunks = fileName.split('.');
      expect(newNameChunks.length).toEqual(2);
      expect(newNameChunks[0]).toEqual(oldNameChunks.length > 1 ? oldNameChunks.slice(0, -1).join('.') : oldNameChunks[0]);
    };

    await test('file');
    await test('file.txt');
  });

  it('should upload file without renaming it (uploadFragmentFile)', async () => {
    spyOn(service, 'listFiles').and.returnValue(of([{ name: 'oldFile' }] as ContentFile[]));

    httpClientMock.put.and.returnValue(defaultResponseContent);

    await expectAsync(lastValueFrom(service.uploadFragmentFile(new File([], 'newFile'), { name: 'fragment', ontologyName: 'ontology' })))
      .toBeResolvedTo({ success: true, data: 'newFile' });
  });

  it('should return success on empty file (uploadTestFile)', async () => {
    await expectAsync(lastValueFrom(service.uploadTestFile())).toBeResolvedTo({ success: true });
  });

  it('should throw error on empty fragment (uploadTestFile)', async () => {
    await expectAsync(lastValueFrom(service.uploadTestFile(new File([], '')))).toBeRejectedWith('Fragment not provided');
  });

  it('should return error on undefined url (uploadTestFile)', async () => {
    spyOn(service, 'listFiles').and.returnValue(of([{ name: 'oldFile' }] as ContentFile[]));
    httpClientMock.put.and.returnValue(defaultResponseContent);
    localStorageGetItemSpy.and.returnValue(null);
    await expectAsync(lastValueFrom(service.uploadTestFile(new File([], 'newFile'), undefined, { name: 'fragment', ontologyName: 'ontology' })))
      .toBeResolvedTo({ success: false, message: 'Could not get url. Missing repository or branch' });
  });

  it('should return error on httpError (uploadTestFile)', async () => {
    spyOn(service, 'listFiles').and.returnValue(of([{ name: 'oldFile' }] as ContentFile[]));
    httpClientMock.put.and.returnValue(throwError(() => buildErrorResponse(400, 'Http error')));
    await expectAsync(lastValueFrom(service.uploadTestFile(new File([], 'newFile'), undefined, { name: 'fragment', ontologyName: 'ontology' })))
      .toBeResolvedTo({ success: false, message: 'Http error' });
  });

  it('should rename file on duplicated name (uploadTestFile)', async () => {
    const listFilesSpy = spyOn(service, 'listTestFiles');
    httpClientMock.put.and.returnValue(defaultResponseContent);

    const test = async (fileName: string): Promise<void> => {
      listFilesSpy.and.returnValue(of([{ name: fileName }] as ContentFile[]));
      const result = await lastValueFrom(service.uploadTestFile(new File([], fileName), undefined, { name: 'fragment', ontologyName: 'ontology' }));

      const newNameChunks = result.data?.split('_') || [];
      const oldNameChunks = fileName.split('.');
      expect(newNameChunks.length).toEqual(2);
      expect(newNameChunks[0]).toEqual(oldNameChunks.length > 1 ? oldNameChunks.slice(0, -1).join('.') : oldNameChunks[0]);
    };

    await test('file');
    await test('file.txt');
  });

  it('should upload file without renaming it (uploadTestFile)', async () => {
    spyOn(service, 'listFiles').and.returnValue(of([{ name: 'oldFile' }] as ContentFile[]));

    httpClientMock.put.and.returnValue(defaultResponseContent);

    await expectAsync(lastValueFrom(service.uploadTestFile(new File([], 'newFile'), undefined, { name: 'fragment', ontologyName: 'ontology' })))
      .toBeResolvedTo({ success: true, data: 'newFile' });
  });

  it('should rename file on duplicated name (uploadTestFile)', async () => {
    const listFilesSpy = spyOn(service, 'listTestFiles');
    httpClientMock.put.and.returnValue(defaultResponseContent);

    const test = async (fileName: string): Promise<void> => {
      listFilesSpy.and.returnValue(of([{ name: fileName }] as ContentFile[]));
      const result = await lastValueFrom(service.uploadTestFile(new File([], fileName), undefined, { name: 'fragment', ontologyName: 'ontology' }));

      const newNameChunks = result.data?.split('_') || [];
      const oldNameChunks = fileName.split('.');
      expect(newNameChunks.length).toEqual(2);
      expect(newNameChunks[0]).toEqual(oldNameChunks.length > 1 ? oldNameChunks.slice(0, -1).join('.') : oldNameChunks[0]);
    };

    await test('file');
    await test('file.txt');
  });

  it('should upload file without renaming it (uploadTestFile)', async () => {
    spyOn(service, 'listFiles').and.returnValue(of([{ name: 'oldFile' }] as ContentFile[]));

    httpClientMock.put.and.returnValue(defaultResponseContent);

    await expectAsync(lastValueFrom(service.uploadTestFile(new File([], 'newFile'), undefined, { name: 'fragment', ontologyName: 'ontology' })))
      .toBeResolvedTo({ success: true, data: 'newFile' });
  });

  it('should upload file into fragment root folder (uploadTestFile)', async () => {
    spyOn(service, 'listFiles').and.returnValue(of([{ name: 'oldFile' }] as ContentFile[]));

    httpClientMock.put.and.returnValue(defaultResponseContent);

    await expectAsync(lastValueFrom(service.uploadTestFile(new File([], 'newFile'), undefined, { name: 'fragment', ontologyName: 'ontology' })))
      .toBeResolvedTo({ success: true, data: 'newFile' });

    expect(httpClientMock.put.calls.allArgs()[0][0]).toContain('.xd-testing/ontology/fragment/newFile');
  });

  it('should upload file into type-specific folder (uploadTestFile)', async () => {
    spyOn(service, 'listFiles').and.returnValue(of([{ name: 'oldFile' }] as ContentFile[]));

    httpClientMock.put.and.returnValue(defaultResponseContent);

    await expectAsync(lastValueFrom(service.uploadTestFile(new File([], 'newFile'), 'query', { name: 'fragment', ontologyName: 'ontology' })))
      .toBeResolvedTo({ success: true, data: 'newFile' });

    expect(httpClientMock.put.calls.allArgs()[0][0]).toContain('.xd-testing/ontology/fragment/queries/newFile');
  });

  it('should delete fragment', async () => {
    const toRemove: Fragment = { name: 'fragment', ontologyName: 'ontology' };
    const updateFragmentsSpy = spyOn<any>(service, '_updateFragments');

    updateFragmentsSpy.and.returnValue(defaultResponseContent);
    spyOn(service, 'getFragments').and.returnValue(of([
      { name: 'fragment', ontologyName: 'otherOntology' },
      { name: 'otherFragment', ontologyName: 'ontology' },
      toRemove
    ]));

    await expectAsync(lastValueFrom(service.deleteFragment(toRemove))).toBeResolvedTo({ success: true });
    expect(updateFragmentsSpy).toHaveBeenCalledWith(
      [
        { name: 'fragment', ontologyName: 'otherOntology' },
        { name: 'otherFragment', ontologyName: 'ontology' }
      ],
      'Removed fragment fragment',
      undefined
    );
  });

  it('should not delete any fragment', async () => {
    const toRemove: Fragment = { name: 'fragment', ontologyName: 'ontology' };
    const fragmentList: Fragment[] = [
      { name: 'fragment', ontologyName: 'otherOntology' },
      { name: 'otherFragment', ontologyName: 'ontology' },
    ];

    const updateFragmentsSpy = spyOn<any>(service, '_updateFragments');

    updateFragmentsSpy.and.returnValue(defaultResponseContent);
    spyOn(service, 'getFragments').and.returnValue(of(fragmentList));

    await expectAsync(lastValueFrom(service.deleteFragment(toRemove))).toBeResolvedTo({ success: true });
    expect(updateFragmentsSpy).toHaveBeenCalledWith(fragmentList, 'Removed fragment fragment', undefined);
  });

  it('should return error on http error (deleteFragment)', async () => {
    const toRemove: Fragment = { name: 'fragment', ontologyName: 'ontology' };
    const fragmentList: Fragment[] = [];

    spyOn<any>(service, '_updateFragments').and.returnValue(throwError(() => buildErrorResponse(400, 'Http error')));
    spyOn(service, 'getFragments').and.returnValue(of(fragmentList));

    await expectAsync(lastValueFrom(service.deleteFragment(toRemove))).toBeResolvedTo({ success: false, message: 'Http error' });
  });

  it('should return success on fragment not found (deleteTestFromFragment)', async () => {
    const toUpdate: Fragment = { name: 'fragment', ontologyName: 'ontology' };
    spyOn(service, 'getFragments').and.returnValue(of([
      { name: 'fragment', ontologyName: 'otherOntology' },
      { name: 'otherFragment', ontologyName: 'ontology' }
    ]));

    await expectAsync(lastValueFrom(service.deleteTestFromFragment(toUpdate, 'CQ001'))).toBeResolvedTo({ success: true });
  });

  it('should remove test (deleteTestFromFragment)', async () => {
    const updateFragmentSpy = spyOn<any>(service, '_updateFragments');
    const getFragmentsSpy = spyOn(service, 'getFragments');
    const fragmentList = [
      { name: 'fragment', ontologyName: 'otherOntology' },
      { name: 'otherFragment', ontologyName: 'ontology' }
    ];

    const toUpdate: Fragment = {
      name: 'fragment',
      ontologyName: 'ontology',
      tests:
        [{
          id: 'CQ001',
          content: '',
          status: 'success',
          type: 'COMPETENCY_QUESTION'
        }]
    };


    async function test(list: Fragment[], fragmentToUpdate: Fragment, testToRemove: string): Promise<void> {
      getFragmentsSpy.and.returnValue(of(list));
      updateFragmentSpy.and.returnValue(defaultResponseContent);

      const updatedList: Fragment[] = [
        ...list.filter(f => f.name !== fragmentToUpdate.name || f.ontologyName !== fragmentToUpdate.ontologyName),
        {
          ...fragmentToUpdate,
          tests: fragmentToUpdate.tests ? fragmentToUpdate.tests.filter(t => t.id !== testToRemove) : fragmentToUpdate.tests
        }
      ];

      await expectAsync(lastValueFrom(service.deleteTestFromFragment(fragmentToUpdate, testToRemove))).toBeResolvedTo({ success: true });
      expect(updateFragmentSpy).toHaveBeenCalledWith(updatedList, `Removed test ${testToRemove} from fragment ${fragmentToUpdate.name}`, undefined);
    }

    await test([...fragmentList, toUpdate], toUpdate, 'CQ001');
    await test([...fragmentList, { ...toUpdate, tests: undefined }], toUpdate, 'CQ001');

    toUpdate.tests!.push({
      id: 'CQ002',
      content: '',
      status: 'success',
      type: 'COMPETENCY_QUESTION'
    });
    await test([...fragmentList, toUpdate], toUpdate, 'CQ001');

  });

  it('should return error on http error', async () => {
    const toUpdate: Fragment = { name: 'fragment', ontologyName: 'ontology' };
    spyOn<any>(service, '_updateFragments').and.returnValue(throwError(() => buildErrorResponse(400, 'Http error')));
    spyOn(service, 'getFragments').and.returnValue(of([
      { name: 'fragment', ontologyName: 'otherOntology' },
      { name: 'otherFragment', ontologyName: 'ontology' },
      toUpdate
    ]));

    await expectAsync(lastValueFrom(service.deleteTestFromFragment(toUpdate, 'CQ001'))).toBeResolvedTo({ success: false, message: 'Http error' });
  });

  it('should throw error on test not found (getFragmentTest)', async () => {
    const fragment: Fragment = { name: 'fragment', ontologyName: 'ontology' };

    spyOn(service, 'getFragment').and.returnValue(of(fragment));
    await expectAsync(lastValueFrom(service.getFragmentTest(fragment, 'CQ001'))).toBeRejectedWith('No test found with id CQ001');

    fragment.tests = [];
    await expectAsync(lastValueFrom(service.getFragmentTest(fragment, 'CQ001'))).toBeRejectedWith('No test found with id CQ001');

    fragment.tests.push({ id: 'CQ002', content: '', status: 'success', type: 'COMPETENCY_QUESTION'});
    await expectAsync(lastValueFrom(service.getFragmentTest(fragment, 'CQ001'))).toBeRejectedWith('No test found with id CQ001');
  });

  it('should return test (getFragmentTest)', async () => {
    const test: TestDetail = { id: 'CQ001', content: '', status: 'success', type: 'COMPETENCY_QUESTION'};
    const fragment: Fragment = { name: 'fragment', ontologyName: 'ontology', tests: [test] };

    spyOn(service, 'getFragment').and.returnValue(of(fragment));
    await expectAsync(lastValueFrom(service.getFragmentTest(fragment, 'CQ001'))).toBeResolvedTo(test);
  });

  it('should not list ontologies', async () => {
    localStorageGetItemSpy.and.returnValue(null);
    await expectAsync(lastValueFrom(service.listOntologies())).toBeRejectedWith('Repository or branch not selected');
  });

  it('should list ontologies', async () => {
    async function test(response?: UserInput, headers?: HeadersDict, statusCode = 200, emptyResponse = false): Promise<void> {
      const error = statusCode >= 300;
      const eTag = service['userInputEtag'];
      const fullResponse: Partial<ContentFile> | undefined = emptyResponse ? undefined : {
        content: encode(JSON.stringify(response))
      };

      httpClientMock.get.calls.reset();
      httpClientMock.get.and.returnValue(error ? throwError(() => buildErrorResponse(statusCode)) : of(buildHttpResponse(fullResponse, headers)));
      const ontologies = await lastValueFrom(service.listOntologies());

      expect(ontologies).toEqual(response?.ontologies || service['userInput']?.ontologies || []);

      if (eTag) {
        expect(httpClientMock.get).toHaveBeenCalledWith(
          `${baseUrl}/repos/user/repo/contents/.xd-testing/UserInput.json?branch=branch`,
          jasmine.objectContaining({ observe: 'response', headers: eTag ? { 'If-None-Match': eTag } : {} })
        );
      }

      expect(service['userInputEtag']).toEqual(error ? eTag : headers?.['etag'].replace('W/', '') || '');

      if (!error) {
        expect(service['userInput']).toEqual(response || { fragments: [], ontologies: [] });
      }
    }

    // execute in sequence to avoid concurrency issues
    await test();
    await test(undefined, undefined, 200, true);
    await test({}, { etag: 'W/1a2b3c' });
    await test({ ontologies: [{ name: 'ontology' }] }, { etag: 'W/4d5e6f' });

    await test({}, undefined, 304);

    service['userInput'] = undefined;
    await test({}, undefined, 304);

    service['userInput'] = {};
    await test({}, undefined, 304);

    service['userInput'] = { ontologies: [{ name: 'ontology' }]};
    await test({}, undefined, 304);
  });

  it('should throw error on required field missing (uploadOntology)', async () => {
    await expectAsync(lastValueFrom(service.uploadOntology({ name: 'ontology' }))).toBeRejectedWith('Neither file nor URL provided');

    const dataTransfer = new DataTransfer();
    await expectAsync(lastValueFrom(service.uploadOntology({ name: 'ontology', file: dataTransfer.files, url: ''}))).toBeRejectedWith('Neither file nor URL provided');
  });

  it('should throw on duplicate ontology (uploadOntology)', async () => {
    spyOn(service, 'listOntologies').and.returnValue(of([{ name: 'ontology' }]));
    spyOn(service, 'listFiles').and.returnValue(of([]));

    const dataTransfer = new DataTransfer();
    const toCreate: OntologyForm = { name: 'ontology', url: 'someUrl'};


    await expectAsync(lastValueFrom(service.uploadOntology(toCreate))).toBeResolvedTo({ success: false, message: 'Duplicated ontology: an ontology with name "ontology" is already defined' });

    dataTransfer.items.add(new File([], 'file'));
    toCreate.file = dataTransfer.files;
    toCreate.url = undefined;
    await expectAsync(lastValueFrom(service.uploadOntology(toCreate))).toBeResolvedTo({ success: false, message: 'Duplicated ontology: an ontology with name "ontology" is already defined' });
  });

  it('should return error on undefined url (uploadOntology)', async () => {
    spyOn(service, 'listOntologies').and.returnValue(of([{ name: 'otherOntology' }]));
    spyOn(service, 'listFiles').and.returnValue(of([{ name: 'oldFile' }] as ContentFile[]));

    httpClientMock.put.and.returnValue(defaultResponseContent);
    localStorageGetItemSpy.and.returnValue(null);

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File([], 'file'));

    await expectAsync(lastValueFrom(service.uploadOntology({ name: 'ontology', file: dataTransfer.files })))
      .toBeResolvedTo({ success: false, message: 'Repository or branch not selected' });
  });

  it('should return error on httpError (uploadOntology)', async () => {
    spyOn(service, 'listOntologies').and.returnValue(of([{ name: 'otherOntology' }]));
    spyOn(service, 'listFiles').and.returnValue(of([{ name: 'oldFile' }] as ContentFile[]));

    httpClientMock.put.and.returnValue(throwError(() => buildErrorResponse(400, 'Http error')));

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File([], 'file'));

    await expectAsync(lastValueFrom(service.uploadOntology({ name: 'ontology', file: dataTransfer.files })))
      .toBeResolvedTo({ success: false, message: 'Http error' });
  });

  it('should rename file on duplicated name (uploadOntology)', async () => {
    const listFilesSpy = spyOn(service, 'listFiles');
    const updateUserInputSpy = spyOn<any>(service, '_updateUserInput').and.callFake((data: string) => {
      service['userInput'] = JSON.parse(data);
      return of(defaultResponseContent);
    });

    spyOn(service, 'listOntologies').and.returnValue(of([{ name: 'otherOntology' }]));
    httpClientMock.put.and.returnValue(defaultResponseContent);

    const test = async (fileName: string): Promise<void> => {
      const dataTransfer = new DataTransfer();

      listFilesSpy.and.returnValue(of([{ name: fileName }] as ContentFile[]));
      dataTransfer.items.add(new File([], fileName));

      await lastValueFrom(service.uploadOntology({ name: 'ontology', file: dataTransfer.files }));

      // get last inserted ontology
      const newNameChunks = service['userInput']!.ontologies!.slice(-1)[0].url!.split('/').splice(-1)[0].split('_');
      const oldNameChunks = fileName.split('.');
      expect(newNameChunks.length).toEqual(2);
      expect(newNameChunks[0]).toEqual(oldNameChunks.length > 1 ? oldNameChunks.slice(0, -1).join('.') : oldNameChunks[0]);
    };

    await test('file');
    await test('file.txt');

    const updateUserInputSpyArgs = updateUserInputSpy.calls.allArgs();
    expect(JSON.parse(updateUserInputSpyArgs[0][0] as string).ontologies.length).toEqual(1);
    expect(JSON.parse(updateUserInputSpyArgs[1][0] as string).ontologies.length).toEqual(2);
  });

  it('should upload file without renaming it (uploadOntology)', async () => {
    spyOn(service, 'listOntologies').and.returnValue(of([{ name: 'otherOntology' }]));
    spyOn(service, 'listFiles').and.returnValue(of([{ name: 'oldFile' }] as ContentFile[]));

    const updateUserInputSpy = spyOn<any>(service, '_updateUserInput').and.callFake((data: string) => {
      service['userInput'] = JSON.parse(data);
      return of(defaultResponseContent);
    });

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File([], 'newFile'));

    httpClientMock.put.and.returnValue(defaultResponseContent);

    await expectAsync(lastValueFrom(service.uploadOntology({ name: 'ontology', file: dataTransfer.files })))
      .toBeResolvedTo({ success: true });

    const newName = service['userInput']!.ontologies!.slice(-1)[0].url!.split('/').splice(-1)[0];
    expect(newName).toEqual('newFile');

    const updateUserInputSpyArgs = updateUserInputSpy.calls.allArgs();
    expect(JSON.parse(updateUserInputSpyArgs[0][0] as string).ontologies.length).toEqual(1);
  });

  it('should reference ontology file url (uploadOntology)', async () => {
    spyOn(service, 'listOntologies').and.returnValue(of([{ name: 'otherOntology' }]));
    spyOn(service, 'listFiles').and.returnValue(of([{ name: 'oldFile' }] as ContentFile[]));

    const updateUserInputSpy = spyOn<any>(service, '_updateUserInput').and.callFake((data: string) => {
      service['userInput'] = JSON.parse(data);
      return of(defaultResponseContent);
    });

    httpClientMock.put.and.returnValue(defaultResponseContent);

    await expectAsync(lastValueFrom(service.uploadOntology({ name: 'ontology', url: 'someUrl' })))
      .toBeResolvedTo({ success: true });

    const updateUserInputSpyArgs = updateUserInputSpy.calls.allArgs();
    expect(JSON.parse(updateUserInputSpyArgs[0][0] as string).ontologies.length).toEqual(1);
    expect(JSON.parse(updateUserInputSpyArgs[0][0] as string).ontologies[0].url).toEqual('someUrl');
  });

  it('should throw error on application error (uploadOntology)', async () => {
    spyOn(service, 'listOntologies').and.returnValue(of([{ name: 'otherOntology' }]));
    spyOn(service, 'listFiles').and.returnValue(of([{ name: 'oldFile' }] as ContentFile[]));

    const updateUserInputSpy = spyOn<any>(service, '_updateUserInput').and.callFake((data: string) => {
      service['userInput'] = JSON.parse(data);
      return of(defaultResponseContent);
    });

    httpClientMock.put.and.returnValue(defaultResponseContent);

    await expectAsync(lastValueFrom(service.uploadOntology({ name: 'ontology', url: 'someUrl' })))
      .toBeResolvedTo({ success: true });

    const updateUserInputSpyArgs = updateUserInputSpy.calls.allArgs();
    expect(JSON.parse(updateUserInputSpyArgs[0][0] as string).ontologies.length).toEqual(1);
    expect(JSON.parse(updateUserInputSpyArgs[0][0] as string).ontologies[0].url).toEqual('someUrl');
  });

  it('should correctly delete ontology', async () => {
    const updateUserInputSpy = spyOn<any>(service, '_updateUserInput').and.returnValue(defaultResponseContent);
    const listOntologiesSpy = spyOn(service, 'listOntologies');

    async function test (toRemove: string, userInput?: UserInput, expectations?: (filteredUserInput: UserInput) => void): Promise<void> {
      updateUserInputSpy.calls.reset();

      service['userInput'] = userInput;
      listOntologiesSpy.and.returnValue(of(userInput?.ontologies || []));

      await expectAsync(lastValueFrom(service.deleteOntology(toRemove))).toBeResolvedTo({ success: true });

      if (!userInput) {
        userInput = {};
      }

      userInput.ontologies = (userInput.ontologies || []).filter(o => o.name !== toRemove);
      userInput.fragments = (userInput.fragments || []).filter(f => f.ontologyName !== toRemove);

      const [updatedUserInput, commitMsg] = updateUserInputSpy.calls.argsFor(0) as Parameters<ApiService['_updateUserInput']>;
      expect(JSON.parse(updatedUserInput)).toEqual(jasmine.objectContaining(userInput));
      expect(commitMsg).toEqual(`Removed ontology ${toRemove}`);

      expectations?.(userInput);
    }

    await test('toRemove', {
      ontologies:[{ name: 'toRemove' }],
      fragments: [
        { name: 'f1', ontologyName: 'someOntology'},
        { name: 'f2', ontologyName: 'toRemove' }
      ]},
      userInput => { expect(userInput.fragments!.length).toEqual(1); expect(userInput.ontologies!.length).toEqual(0);  }
    );

    await test('toRemove', {
      ontologies:[{ name: 'toRemove' }],
      fragments: [
        { name: 'f1', ontologyName: 'someOntology'},
      ]},

      userInput => { expect(userInput.fragments!.length).toEqual(1); expect(userInput.ontologies!.length).toEqual(0);  }
    );

    await test('toRemove', {
      ontologies:[{ name: 'someOntology' }],
      fragments: [
        { name: 'f1', ontologyName: 'someOntology'},
      ]},
      userInput => { expect(userInput.fragments!.length).toEqual(1); expect(userInput.ontologies!.length).toEqual(1);  }
    );

    await test('toRemove', { ontologies:[{ name: 'someOntology' }] }, userInput => {
      expect(userInput.fragments!.length).toEqual(0); expect(userInput.ontologies!.length).toEqual(1);
    });

    await test('toRemove', undefined, userInput => {
      expect(userInput.fragments!.length).toEqual(0); expect(userInput.ontologies!.length).toEqual(0);
    });
  });

  it('should return error on http error (deleteOntology)', async () => {
    spyOn<any>(service, '_updateUserInput').and.returnValue(throwError(() => buildErrorResponse(400, 'Error')));
    spyOn(service, 'listOntologies').and.returnValue(of([]));

    await expectAsync(lastValueFrom(service.deleteOntology('toRemove'))).toBeResolvedTo({ success: false, message: 'Error' });
  });

  it('should not add ontology (updateOntologies)', async () => {
    const toAdd = { name: 'ontology', url: 'someUrl' };
    const updateUserInputSpy = spyOn<any>(service, '_updateUserInput').and.returnValue(defaultResponseContent);
    spyOn(service, 'listOntologies').and.returnValue(of([]));

    await expectAsync(lastValueFrom(service.updateOntologies([toAdd]))).toBeResolvedTo({ success: true });

    const args = updateUserInputSpy.calls.argsFor(0) as Parameters<ApiService['_updateUserInput']>;
    expect(JSON.parse(args[0])).toEqual(jasmine.objectContaining({ ontologies: [], fragments: [] }));
  });

  it('should discard ontology with no url (updateOntologies)', async () => {
    const toUpdate = { name: 'ontology' };
    const updateUserInputSpy = spyOn<any>(service, '_updateUserInput').and.returnValue(defaultResponseContent);

    service['userInput'] = {};
    spyOn(service, 'listOntologies').and.returnValue(of([toUpdate]));

    await expectAsync(lastValueFrom(service.updateOntologies([{...toUpdate, userDefined: false, url: 'someUrl' }]))).toBeResolvedTo({ success: true });

    const args = updateUserInputSpy.calls.argsFor(0) as Parameters<ApiService['_updateUserInput']>;
    expect(JSON.parse(args[0])).toEqual(jasmine.objectContaining({ ontologies: [toUpdate], fragments: [] }));
  });

  it('should update ontology (updateOntologies)', async () => {
    const toUpdate = { name: 'ontology', url: 'someUrl' };
    const updated = {...toUpdate, name: 'newName' };

    const updateUserInputSpy = spyOn<any>(service, '_updateUserInput').and.returnValue(defaultResponseContent);

    service['userInput'] = { fragments: [{ name: 'f', ontologyName: 'o' }] };
    spyOn(service, 'listOntologies').and.returnValue(of([toUpdate]));

    await expectAsync(lastValueFrom(service.updateOntologies([updated]))).toBeResolvedTo({ success: true });

    const args = updateUserInputSpy.calls.argsFor(0) as Parameters<ApiService['_updateUserInput']>;
    expect(JSON.parse(args[0])).toEqual(jasmine.objectContaining({ ontologies: [updated], fragments: service['userInput'].fragments }));
  });

  it('should return error on http error (updateOntologies)', async () => {
    spyOn<any>(service, '_updateUserInput').and.returnValue(throwError(() =>buildErrorResponse(400, 'Error') ));
    spyOn(service, 'listOntologies').and.returnValue(of([]));

    await expectAsync(lastValueFrom(service.updateOntologies([]))).toBeResolvedTo({ success: false, message: 'Error' });
  });

  it('should block update on missing url', () => {
    localStorageGetItemSpy.and.returnValue(null);
    expect(service['_updateUserInput']('', '')).toBe(EMPTY);
  });

  it('should add sha to request body if provided as argument', async () => {
    httpClientMock.put.and.returnValue(of(null));
    await lastValueFrom(service['_updateUserInput']('', '', 'sha'));

    const args =  httpClientMock.put.calls.argsFor(0) as [string, CreateOrUpdateFile];
    expect(args[1].sha).toEqual('sha');
  });

  it('should base64-encode body', async () => {
    httpClientMock.put.and.returnValue(of(null));
    await lastValueFrom(service['_updateUserInput']('Some content', 'Some message', 'sha'));

    const args =  httpClientMock.put.calls.argsFor(0) as [string, CreateOrUpdateFile];
    expect(args[1]).toEqual(jasmine.objectContaining({
      message: 'Some message',
      content: encode('Some content') // U29tZSBjb250ZW50
    }));
  });

  it('should replace old fragments and store new userInput (_updateFragments)', async () => {
    const updateUserInputSpy = spyOn<any>(service, '_updateUserInput');

    async function test(fragments: Fragment[], userInput?: UserInput, returnValue: any = {}): Promise<void> {
      service['userInput'] = userInput;
      updateUserInputSpy.and.returnValue(of(returnValue));

      await lastValueFrom(service['_updateFragments'](fragments, 'Some message'));

      expect(service['userInputSha']).toEqual(returnValue.content?.sha);
      expect(service['userInputEtag']).toEqual(`"${returnValue.content?.sha}"`);
      expect(service['userInput']).toEqual(jasmine.objectContaining({ ...userInput || {}, fragments }));
    }

    await test([]);
    await test([{ name: 'f', ontologyName: 'o' }]);
    await test([{ name: 'f', ontologyName: 'o' }], { ontologies: [{ name: 'o' }], fragments: [{ name: 'f2', ontologyName: 'o2' }] });
    await test([],{ ontologies: [{ name: 'o' }] }, { content: { sha: 'sha' }});
  });

  it('should return default user input (_parseUserInput)', () => {
    let result = service['_parseUserInput'](buildHttpResponse<any>(undefined));
    expect(result).toEqual(jasmine.objectContaining({ ontologies: [], fragments: [] }));

    result = service['_parseUserInput'](buildHttpResponse<any>({ }));
    expect(result).toEqual(jasmine.objectContaining({ ontologies: [], fragments: [] }));

    result = service['_parseUserInput'](buildHttpResponse<any>({ content: null }));
    expect(result).toEqual(jasmine.objectContaining({ ontologies: [], fragments: [] }));

    result = service['_parseUserInput'](buildHttpResponse<any>({ content: '' }));
    expect(result).toEqual(jasmine.objectContaining({ ontologies: [], fragments: [] }));
  });

  it('should return userInput and save etag and sha (_parseUserInput)', () => {
    const userInput: UserInput = { ontologies: [{ name: 'o' }], fragments: [{ name: 'f', ontologyName: 'o' }]};
    const result = service['_parseUserInput'](buildHttpResponse<any>({
      content: encode(JSON.stringify(userInput)),
      sha: 'sha'
    }, { etag: 'W/etag' }));

    expect(result).toEqual(jasmine.objectContaining(userInput));
  });
});
