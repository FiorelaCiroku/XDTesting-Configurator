<?php

namespace Tests\Unit;

use Tests\TestCase;

class IsAuthTest extends TestCase
{
    public function testShouldReturnUnauthorizedWhenMissingAccessToken()
    {
        $app = $this->getAppInstance();

        $request = $this->createRequest('GET', "$_ENV[ROUTES_PREFIX]/is-auth");
        $response = $app->handle($request);

        $this->assertEquals(401, $response->getStatusCode());
    }

    public function testShouldReturnOkWhenAccessTokenCookieIsPresent()
    {
        $app = $this->getAppInstance();

        $request = $this->createRequest('GET', "$_ENV[ROUTES_PREFIX]/is-auth", cookies: [
            'GITHUB_TOKEN' => 'encryptedAccessToken'
        ]);

        $response = $app->handle($request);
        $this->assertEquals(200, $response->getStatusCode());
    }
}