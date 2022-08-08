import { HttpClient } from '@angular/common/http';
import { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';

const httpClientMock = {} as HttpClient;
const providers: Provider[] = [
  { provide: HttpClient, useValue: httpClientMock }
];

describe('ApiService', () => {
  let service: ApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers
    });
    service = TestBed.inject(ApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
