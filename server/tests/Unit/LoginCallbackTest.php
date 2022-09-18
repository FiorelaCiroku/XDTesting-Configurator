<?php

namespace Tests\Unit;

use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Tests\TestCase;

class LoginCallbackTest extends TestCase
{
    public function testShouldReturnErrorOnMissingCode()
    {
        $test = function(string $queryString = '') {
            $app = $this->getAppInstance();
            $request = $this->createRequest('GET',"$_ENV[ROUTES_PREFIX]/login-callback", $queryString);
            $response = $app->handle($request);

            $body = json_decode($this->getResponseBody($response));

            $this->assertEquals(400, $response->getStatusCode());
            $this->assertEquals('Missing code', $body->error);
        };

        $test();
        $test("code=");
    }

    public function testShouldReturnErrorOnHttpError()
    {
        $callbackCode = '1234';
        $mockResponse = new MockResponse(info: [ 'http_code' => 401 ]);
        $app = $this->getAppInstance(diDefinitions: [
            HttpClientInterface::class => new MockHttpClient($mockResponse)
        ]);

        $request = $this->createRequest('GET',"$_ENV[ROUTES_PREFIX]/login-callback", "code=$callbackCode");
        $response = $app->handle($request);

        $this->checkSymfonyRequest($mockResponse, $callbackCode);

        $this->assertEquals(500, $response->getStatusCode());
        $this->assertEquals(['error' => 'Failed retrieving token'], json_decode($this->getResponseBody($response), true));
    }

    public function testShouldReturnErrorIfAccessTokenMissing()
    {
        $callbackCode = '1234';
        $mockResponse = new MockResponse(http_build_query(['other_field' => 'some random data']), ['http_code' => 200]);
        $app = $this->getAppInstance(diDefinitions: [
            HttpClientInterface::class => new MockHttpClient($mockResponse)
        ]);

        $request = $this->createRequest('GET',"$_ENV[ROUTES_PREFIX]/login-callback", "code=$callbackCode");
        $response = $app->handle($request);

        $this->checkSymfonyRequest($mockResponse, $callbackCode);

        $this->assertEquals(500, $response->getStatusCode());
        $this->assertEquals(['error' => 'Failed retrieving token'], json_decode($this->getResponseBody($response), true));

    }

    public function testShouldReturnEncryptedAccessToken()
    {
        $callbackCode = '1234';
        $accessToken = 'GithubAccessToken';
        $mockResponse = new MockResponse(http_build_query(['access_token' => $accessToken]), ['http_code' => 200]);
        $app = $this->getAppInstance(diDefinitions: [
            HttpClientInterface::class => new MockHttpClient($mockResponse),
            'setcookie' => function() use ($accessToken) {
                return function(
                    string $name, string $value = "", int $expires_or_options = 0, string $path = "",
                    string $domain = "", bool $secure = false, bool $httponly = false
                ) use ($accessToken)
                {
                    $this->assertEquals('GITHUB_TOKEN', $name);
                    $this->assertNotEmpty($value);
                    $this->assertTrue($httponly);

                    [$iv, $token] = explode('.', base64_decode($value));
                    $token = openssl_decrypt(base64_decode($token), 'aes-256-cbc', $_ENV['AES_SECRET'], iv: base64_decode($iv));

                    $this->assertTrue($token !== false);

                    $token = base64_decode($token);
                    $token = substr($token, 31, -61);

                    $this->assertEquals($accessToken, $token);
                };
            }
        ]);

        $request = $this->createRequest('GET',"$_ENV[ROUTES_PREFIX]/login-callback", "code=$callbackCode");
        $response = $app->handle($request);

        $this->checkSymfonyRequest($mockResponse, $callbackCode);

        $this->assertEquals(200, $response->getStatusCode());
    }

    private function checkSymfonyRequest(MockResponse $mockResponse, string $callbackCode): void
    {
        $githubRequestBody = json_decode($mockResponse->getRequestOptions()['body'], true);
        $expectedGithubRequestBody = [
            'client_id' => $_ENV['CLIENT_ID'],
            'client_secret' => $_ENV['CLIENT_SECRET'],
            'code' => $callbackCode
        ];

        $this->assertEquals('https://github.com/login/oauth/access_token', $mockResponse->getRequestUrl());
        $this->assertContains('Content-Type: application/json', $mockResponse->getRequestOptions()['headers']);
        $this->assertEqualsCanonicalizing($expectedGithubRequestBody, $githubRequestBody);
    }

}