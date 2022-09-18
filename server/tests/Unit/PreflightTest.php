<?php

namespace Tests\Unit;

use Slim\Exception\HttpMethodNotAllowedException;
use Tests\TestCase;

class PreflightTest extends TestCase
{
    public function testShouldSendCorsHeadersInDevMode() {
        $app = $this->getAppInstance(function() {
            $_ENV['ENV'] = 'dev';
        });

        $request = $this->createRequest('OPTIONS', "/some-route");

        $response = $app->handle($request);
        $headers = $response->getHeaders();

        $this->assertEquals($_ENV['FRONTEND_URL'], $headers['Access-Control-Allow-Origin'][0]);
        $this->assertEquals("*", $headers['Access-Control-Allow-Headers'][0]);
        $this->assertEquals("true", $headers['Access-Control-Allow-Credentials'][0]);
        $this->assertEquals("GET,PUT", $headers['Access-Control-Allow-Methods'][0]);
    }

    public function testShouldDisallowOptionsMethodIfNotInDevMode() {
        $app = $this->getAppInstance();

        $request = $this->createRequest('OPTIONS', "/some-route");

        $this->expectExceptionCode(405);
        $this->expectException(HttpMethodNotAllowedException::class);
        $this->expectExceptionMessage('Method not allowed. Must be one of: GET, PUT');

        $app->handle($request);
    }
}