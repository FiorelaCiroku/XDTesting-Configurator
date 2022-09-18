<?php

namespace Tests\Unit;

use App\Application\Actions\Action;
use App\Application\Actions\ActionPayload;
use DateTimeImmutable;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Log\LoggerInterface;
use Tests\TestCase;

class LoginTest extends TestCase
{
    public function testShouldReturnLoginRedirect(): void
    {
        $app = $this->getAppInstance();

        $request = $this->createRequest('GET', "$_ENV[ROUTES_PREFIX]/login");
        $response = $app->handle($request);

        $this->assertEquals(302, $response->getStatusCode());

        $headers = $response->getHeaders();
        $qs = http_build_query([
            'scope' => 'read:user public_repo',
            'client_id' => $_ENV['CLIENT_ID']
        ]);

        $this->assertEquals("https://github.com/login/oauth/authorize?$qs", $headers['Location'][0]);
    }
}
