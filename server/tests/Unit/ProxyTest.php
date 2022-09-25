<?php

namespace Tests\Unit;

use Psr\Http\Message\ResponseInterface;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Tests\TestCase;

class ProxyTest extends TestCase
{
    private static string $token = 'token';


    public function testShouldReturnUnauthorizedOnMissingOrInvalidToken()
    {
        $test = function (string $token = null) {
            $app = $this->getAppInstance();

            $cookies = [];
            if (!empty($token)) {
                $cookies['GITHUB_TOKEN'] = $token;
            }

            $request = $this->createRequest('GET', "$_ENV[ROUTES_PREFIX]/some-route", cookies: $cookies);
            $response = $app->handle($request);

            $this->assertEquals(401, $response->getStatusCode());
        };

        $iv = base64_encode(random_bytes(16));
        $encryptedToken = base64_encode('invalidEncryptedToken');

        $test();
        $test(base64_encode("$iv.$encryptedToken"));
    }

    public function testShouldProxyRequests()
    {
        $response = $this->sendRequest("$_ENV[ROUTES_PREFIX]/some-route", new MockResponse('some response'));
        $this->assertEquals('some response', $this->getResponseBody($response));


        $response = $this->sendRequest("$_ENV[ROUTES_PREFIX]/some-route", new MockResponse('{}', [
            'response_headers' => [
                'Content-Type' => 'application/json',
                'Server' => 'Server',
                'Content-Encoding' => 'content-encoding',
                'Transfer-Encoding' => 'transfer-encoding',
            ]
        ]));

        $this->assertEquals('{}', $this->getResponseBody($response));


        $this->sendRequest("/some-route", reqHeaders: ['If-None-Match' => 'etag']);
    }

    public function testShouldReturnErrorOnTryingToWriteInOtherDirectory()
    {
        $app = $this->getAppInstance(diDefinitions: [
            HttpClientInterface::class => new MockHttpClient(new MockResponse())
        ]);

        $encryptedToken = $this->encryptToken();
        $request = $this->createRequest(
            'PUT',
            '/user/repo/contents/some-dir',
            cookies: ['GITHUB_TOKEN' => $encryptedToken]
        );

        $response = $app->handle($request);

        $this->assertEquals(405, $response->getStatusCode());
        $this->assertEquals(
            '{"error":"You can only read from specified directory"}',
            $this->getResponseBody($response)
        );
    }

    public function testShouldReturnNotErrorOnTryingToWriteInXdTestingDirectory()
    {
        $app = $this->getAppInstance(diDefinitions: [
            HttpClientInterface::class => new MockHttpClient(new MockResponse('{}'))
        ]);

        $encryptedToken = $this->encryptToken();
        $request = $this->createRequest(
            'PUT',
            '/user/repo/contents/.xd-testing',
            cookies: ['GITHUB_TOKEN' => $encryptedToken]
        );

        $response = $app->handle($request);

        $this->assertEquals(200, $response->getStatusCode());
    }


    private function sendRequest(string $url, MockResponse $mockResponse = null, array $reqHeaders = []): ResponseInterface
    {
        if ($mockResponse === null) {
            $mockResponse = new MockResponse();
        }

        $app = $this->getAppInstance(diDefinitions: [
            HttpClientInterface::class => new MockHttpClient($mockResponse)
        ]);

        $encryptedToken = $this->encryptToken();
        $request = $this->createRequest('GET', $url, headers: $reqHeaders, cookies: ['GITHUB_TOKEN' => $encryptedToken]);
        $response = $app->handle($request);

        $headers = array_keys($response->getHeaders());

        foreach ($headers as &$header) {
            $header = strtolower($header);
        }

        $path = preg_replace('/^' . preg_quote($_ENV['ROUTES_PREFIX'], '/') . '\/?/', '', $url);
        $path = str_starts_with($path, '/') ? substr($path, 1) : $path;
        $url = 'https://api.github.com/' . $path;

        $this->assertEquals($mockResponse->getStatusCode(), $response->getStatusCode());
        $this->assertEquals($url, $mockResponse->getRequestUrl());
        $this->assertContains('Authorization: Bearer gho_' . self::$token, $mockResponse->getRequestOptions()['headers']);
        $this->assertNotContains('server', $headers);
        $this->assertNotContains('content-encoding', $headers);
        $this->assertNotContains('transfer-encoding', $headers);

        return $response;
    }


    private function encryptToken(): string
    {
        $prevSalt = random_bytes(31);
        $nextSalt = random_bytes(61);
        $token = base64_encode($prevSalt . self::$token . $nextSalt);

        $iv = random_bytes(16);
        $token = openssl_encrypt($token, 'aes-256-cbc', $_ENV['AES_SECRET'], iv: $iv);
        return base64_encode(base64_encode($iv) . '.' . base64_encode($token));
    }
}
